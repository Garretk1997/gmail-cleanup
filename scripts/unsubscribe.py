#!/usr/bin/env python3
"""
One-click bulk unsubscriber (RFC 8058).

Clicking Gmail's "Unsubscribe" button is slow and unreliable to automate -- the
web UI serves stale rows and your click lands on the wrong message. Skip it.

Most bulk senders include these headers:

    List-Unsubscribe: <https://...>, <mailto:...>
    List-Unsubscribe-Post: List-Unsubscribe=One-Click

That second header means the sender implements RFC 8058: a single HTTP POST
unsubscribes you. No browser, no login, no clicking. This script finds those
headers in raw messages and fires the POST.

USAGE
    python3 unsubscribe.py --dry-run raw/          # inspect first, always
    python3 unsubscribe.py raw/                    # actually unsubscribe
    python3 unsubscribe.py msg1.eml msg2.eml

GETTING RAW MESSAGES
  - Gmail web UI: open a message -> ... menu -> "Download message" (.eml)
  - Gmail API:    users.messages.get(format="raw"), base64url-decode the `raw`
                  field, write it to a .eml file.

Stdlib only. No dependencies.
"""
import argparse
import base64
import glob
import json
import os
import re
import sys
import urllib.error
import urllib.request

UA = "gmail-cleanup-kit/1.0 (+https://github.com/Garretk1997/gmail-cleanup)"


def load_raw(path):
    """Return raw RFC822 bytes from a .eml file or a Gmail API JSON dump."""
    data = open(path, "rb").read()
    stripped = data.lstrip()
    if stripped[:1] in (b"{", b"["):
        try:
            obj = json.loads(data)
            if isinstance(obj, dict) and "raw" in obj:
                return base64.urlsafe_b64decode(obj["raw"] + "===")
        except Exception:
            pass
    return data


def parse_headers(raw):
    """Split off the header block and unfold continuation lines."""
    head = re.split(rb"\r?\n\r?\n", raw, 1)[0].decode("utf-8", "ignore")
    return re.sub(r"\r?\n[ \t]+", " ", head)


def extract(path):
    head = parse_headers(load_raw(path))
    def find(name):
        m = re.search(rf"^{name}\s*:\s*(.+)$", head, re.I | re.M)
        return m.group(1).strip() if m else None

    lu = find("List-Unsubscribe")
    if not lu:
        return None
    https = re.search(r"<(https://[^>]+)>", lu)
    mailto = re.search(r"<(mailto:[^>]+)>", lu)
    return {
        "file": os.path.basename(path),
        "sender": (find("From") or "?")[:70],
        "subject": (find("Subject") or "")[:60],
        "url": https.group(1) if https else None,
        "mailto": mailto.group(1) if mailto else None,
        "one_click": bool(find("List-Unsubscribe-Post")),
    }


def unsubscribe(url, timeout=30):
    req = urllib.request.Request(
        url,
        data=b"List-Unsubscribe=One-Click",
        method="POST",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": UA,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, ""
    except urllib.error.HTTPError as e:
        return e.code, e.reason
    except Exception as e:
        return None, str(e)


def collect(paths):
    files = []
    for p in paths:
        if os.path.isdir(p):
            for ext in ("*.eml", "*.txt", "*.json"):
                files += glob.glob(os.path.join(p, "**", ext), recursive=True)
        else:
            files.append(p)
    return sorted(set(files))


def main():
    ap = argparse.ArgumentParser(description="Bulk one-click unsubscribe (RFC 8058).")
    ap.add_argument("paths", nargs="+", help=".eml files, Gmail API JSON dumps, or directories")
    ap.add_argument("--dry-run", action="store_true", help="show what would happen, send nothing")
    ap.add_argument("--allow-repeat", action="store_true", help="do not de-duplicate by sender domain")
    args = ap.parse_args()

    targets, seen = [], set()
    for f in collect(args.paths):
        try:
            info = extract(f)
        except Exception as e:
            print(f"  skip  {os.path.basename(f)}: {e}", file=sys.stderr)
            continue
        if not info:
            continue
        dom = re.search(r"@([\w.-]+)", info["sender"])
        dom = dom.group(1).lower() if dom else info["sender"]
        if not args.allow_repeat and dom in seen:
            continue
        seen.add(dom)
        targets.append(info)

    if not targets:
        print("No List-Unsubscribe headers found. Are these raw messages?")
        return 1

    print(f"Found {len(targets)} unique sender(s) with an unsubscribe header.\n")
    sent = failed = skipped = 0
    for t in targets:
        if not (t["url"] and t["one_click"]):
            why = "no one-click" + (" (mailto only)" if t["mailto"] else "")
            print(f"  SKIP     {why:<26} {t['sender']}")
            skipped += 1
            continue
        if args.dry_run:
            print(f"  WOULD    POST one-click            {t['sender']}")
            continue
        code, err = unsubscribe(t["url"])
        ok = code is not None and 200 <= code < 400
        sent += ok
        failed += (not ok)
        status = f"HTTP {code}" if code else "ERROR"
        print(f"  {'OK  ' if ok else 'FAIL'}     {status:<26} {t['sender']}" + (f"  {err}" if err and not ok else ""))

    print()
    if args.dry_run:
        print("Dry run. Nothing sent. Re-run without --dry-run to unsubscribe.")
    else:
        print(f"Unsubscribed: {sent}   Failed: {failed}   Skipped: {skipped}")
    print("\nSenders with NO List-Unsubscribe header are non-compliant --")
    print("block those with a Gmail filter instead.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
