# Gmail Cleanup Kit

Filters, scripts and hard-won gotchas for cleaning out a genuinely out-of-control
Gmail account — without deleting anything that matters.

Built while cleaning a real inbox from **54,339 threads / 48,441 unread** down to
**~6,900 / ~4,148**, with zero loss of job applications, invoices, security
alerts or client mail.

| | Before | After |
|---|---|---|
| Inbox threads | 54,339 | ~6,900 |
| Unread | 48,441 | ~4,148 |
| Promotions | 9,045 | ~250 |
| Social | 2,381 | 11 |

---

## The core idea

Most "inbox zero" advice tells you to click things. That does not scale to 50,000
messages, and scripted clicking of Gmail's UI is genuinely unreliable (see
[Gotchas](#gotchas-that-will-waste-your-time)).

What actually works is three lanes, in this order:

1. **Protect** — label money, security, job applications and client mail *first*,
   so the safety net exists before any sweep runs.
2. **Sweep** — archive the junk in bulk, with keyword guards so urgent mail escapes.
3. **Unsubscribe** — stop the inflow at the source via RFC 8058, not by clicking.

Ordering matters. Lane 1 before Lane 2 is the whole trick.

---

## Quick start (about 10 minutes, no install)

Everything below runs in your browser. No Cloud Console project, no OAuth client,
no `pip install`, no credentials on disk.

### Step 1 — create the labels (2 min)

The filters apply labels, so the labels have to exist first.

Go to [script.google.com](https://script.google.com) → **New project** → paste
[`scripts/setup-labels.gs`](scripts/setup-labels.gs) → **Run** → approve the
one-time prompt (it's your own account). Creates all 17 labels. Safe to re-run.

### Step 2 — import the filters (3 min)

Gmail → **Settings → Filters and Blocked Addresses → Import filters**.

Import in this order, and tick **"Apply new filters to existing email"** — that
one checkbox creates the rules *and* does the retroactive cleanup in a single
action.

| File | What it does |
|---|---|
| [`filters/01-protect.xml`](filters/01-protect.xml) | Labels money, security, job applications, tools. **Never archives.** Import first. |
| [`filters/02-junk-archive.xml`](filters/02-junk-archive.xml) | Archives Promotions, Social, Forums, job-alert digests, and the Updates remainder. |
| [`filters/03-auto-archive.xml`](filters/03-auto-archive.xml) | *Optional.* Keeps the inbox from slowly rebuilding. |

These ship working out of the box — the banking rules already cover the major US
banks and card issuers. Open the XML and edit the `from:(...)` lists if yours
isn't there, or to add your own tools and clients.

### Step 3 — unsubscribe from the worst offenders (5 min)

[script.google.com](https://script.google.com) → **New project** → paste
[`scripts/unsubscribe.gs`](scripts/unsubscribe.gs) → **Run**.

It ships with `DRY_RUN = true`, so the first run only *reports* what it would do.
Read the log, then set `DRY_RUN = false` and run again.

It reads the RFC 8058 `List-Unsubscribe` header off your own mail and fires a
single POST per sender — no clicking, no browser automation, server-confirmed.

> Prefer the command line, or already have `.eml` files?
> [`scripts/unsubscribe.py`](scripts/unsubscribe.py) does the same thing offline
> (stdlib only, no dependencies).

### Step 4 — clear the backlog

The retroactive filter pass is best-effort and caps out on very large sets. For
whatever's left, see [`scripts/gmail-bulk-sweep.js`](scripts/gmail-bulk-sweep.js).

> **Unsubscribe before you delete.** Gmail's unsubscribe acts on a message in
> your mailbox — trash the backlog first and there's nothing left to act on.

---

## Gotchas that will waste your time

**Gmail's "Updates" category is not junk.** It hides invoices, bank alerts,
security alerts, flight confirmations and legal notices in among the noise. A
blanket archive of Updates will bury things you need. Sweep only what no
protective label claimed, and keep the `-is:important` guard.

**Job alerts ≠ job applications.** `jobalert.indeed.com` digests are noise.
`hire.lever.co`, `greenhouse.io` and friends carry actual application outcomes.
Different filters. Never merge them.

**`location.hash` leaves Gmail's list stale.** Change the search that way and old
rows keep rendering, your clicks hit the wrong message, and the action button
never appears — while your script reports success. Always do a real page load.

**The row count lies.** Gmail's UI will show ~49 stale rows for a query the API
reports as completely empty. Verify with the API, never the DOM.

**Unsubscribe BEFORE you delete.** Gmail's Unsubscribe button acts on a message
in your mailbox. Trash the backlog first and there is nothing left to
unsubscribe from.

**Gmail's `resultCountEstimate` caps at 201.** Useless for sizing. Read real
counts from `list_labels` (`threadsTotal`), not from search.

**The sidebar "Primary" count is not your inbox size.** Primary is one tab. Quote
`INBOX threadsTotal` or you will report a number ~4x better than reality.

**Sub-50 result sets behave differently.** Below one page there is no "select all
matching" link, and the toolbar sometimes refuses to expose the action button.
Handle those tails via the API.

---

## Safety

- **Archive is reversible.** It removes the `INBOX` label; mail stays in All Mail.
- **Delete means Trash**, recoverable for 30 days. Gmail's `gmail.modify` scope
  *cannot* permanently delete — worst case is always undoable.
- Every sweeping filter carries a `doesNotHaveTheWord` guard for `is:starred`,
  `invoice`, `past due`, `payment failed`, `security alert`, `interview`,
  `your application`.
- **Verify before you act.** Run the search and read the results first. Twice
  during this build, a query that looked right was quietly matching protected
  mail. Checking cost a minute; not checking would have cost a court notice and
  a customer dispute.

Nothing here permanently deletes anything.

---

## Repo layout

```
filters/
  01-protect.xml         Label money/security/jobs/tools. Never archives.
  02-junk-archive.xml    Promotions, Social, Forums, job-alert digests, Updates remainder.
  03-auto-archive.xml    Optional: keep the inbox from rebuilding.
scripts/
  setup-labels.gs        Apps Script: create the label tree. Run this first.
  unsubscribe.gs         Apps Script: RFC 8058 bulk unsubscribe. No credentials.
  unsubscribe.py         Same, offline, from .eml files. Stdlib only.
  gmail-bulk-sweep.js    Browser-console bulk archive/delete.
```

## License

MIT — see [LICENSE](LICENSE).
