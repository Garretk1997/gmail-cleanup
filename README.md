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

## Quick start

### 1. Import the filters

Gmail → **Settings → Filters and Blocked Addresses → Import filters**.

Import in order, and tick **"Apply new filters to existing email"** — that single
checkbox creates the rules *and* does the retroactive cleanup in one action.

```
filters/01-protect.xml        # label only, never archive — import FIRST
filters/02-junk-archive.xml   # archive + mark read, with guards
filters/03-auto-archive.xml   # optional: stop the inbox rebuilding
```

Edit the `from:(...)` lists first — they ship with `YOURBANK.com` placeholders.

### 2. Unsubscribe from the worst offenders

```bash
python3 scripts/unsubscribe.py --dry-run raw/   # always dry-run first
python3 scripts/unsubscribe.py raw/
```

Stdlib only, no dependencies. See the script header for how to get raw messages.

### 3. Bulk-sweep the backlog

The retroactive filter pass is best-effort and caps out on very large sets. For
the rest, see `scripts/gmail-bulk-sweep.js`.

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
  unsubscribe.py         RFC 8058 one-click bulk unsubscribe. Stdlib only.
  gmail-bulk-sweep.js    Browser-console bulk archive/delete.
```

## License

MIT — see [LICENSE](LICENSE).
