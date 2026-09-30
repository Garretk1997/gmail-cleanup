/**
 * unsubscribe.gs — bulk one-click unsubscribe, entirely inside your own Gmail.
 *
 * No credentials. No Cloud Console. No OAuth client. No downloads.
 * This is the zero-friction version of scripts/unsubscribe.py — use this one
 * unless you already have raw .eml files lying around.
 *
 * HOW IT WORKS
 *   Bulk senders include an RFC 8058 header pair:
 *       List-Unsubscribe: <https://...>
 *       List-Unsubscribe-Post: List-Unsubscribe=One-Click
 *   A single HTTP POST to that URL unsubscribes you. This reads the header off
 *   your own mail and fires the POST. Clicking Gmail's Unsubscribe button is
 *   slow and unreliable to script; this is not.
 *
 * HOW TO RUN
 *   1. https://script.google.com  ->  New project
 *   2. Paste this whole file in
 *   3. Leave DRY_RUN = true. Click Run. Approve the permission prompt.
 *   4. Read the log. It lists every sender it WOULD unsubscribe from.
 *   5. Happy? Set DRY_RUN = false and Run again.
 *
 * TUNING
 *   QUERY       which mail to scan. Default: promos from the last year.
 *   MAX_THREADS how many threads to scan (not how many senders).
 *   Results are de-duplicated by sender domain, so one POST per sender.
 */

const DRY_RUN     = true;                              // flip to false to actually unsubscribe
const QUERY       = 'category:promotions newer_than:1y';
const MAX_THREADS = 300;

function bulkUnsubscribe() {
  const threads = GmailApp.search(QUERY, 0, MAX_THREADS);
  Logger.log('Scanning ' + threads.length + ' threads matching: ' + QUERY + '\n');

  const seen = {}, targets = [];

  threads.forEach(thread => {
    let msg;
    try { msg = thread.getMessages()[0]; } catch (e) { return; }

    let raw;
    try { raw = msg.getRawContent(); } catch (e) { return; }

    const head = raw.split(/\r?\n\r?\n/)[0].replace(/\r?\n[ \t]+/g, ' ');
    const lu   = head.match(/^List-Unsubscribe\s*:\s*(.+)$/im);
    if (!lu) return;

    const oneClick = /^List-Unsubscribe-Post\s*:/im.test(head);
    const url      = (lu[1].match(/<(https:\/\/[^>]+)>/) || [])[1];
    const from     = msg.getFrom();
    const domain   = ((from.match(/@([\w.-]+)/) || [])[1] || from).toLowerCase();

    if (seen[domain]) return;
    seen[domain] = true;
    targets.push({ from: from, domain: domain, url: url, oneClick: oneClick });
  });

  Logger.log('Found ' + targets.length + ' unique sender(s) with an unsubscribe header.\n');

  let ok = 0, failed = 0, skipped = 0;

  targets.forEach(t => {
    if (!t.url || !t.oneClick) {
      Logger.log('SKIP   no one-click          ' + t.from);
      skipped++;
      return;
    }
    if (DRY_RUN) {
      Logger.log('WOULD  POST one-click        ' + t.from);
      return;
    }
    try {
      const res = UrlFetchApp.fetch(t.url, {
        method: 'post',
        payload: 'List-Unsubscribe=One-Click',
        contentType: 'application/x-www-form-urlencoded',
        muteHttpExceptions: true,
        followRedirects: true,
      });
      const code = res.getResponseCode();
      if (code >= 200 && code < 400) { ok++;     Logger.log('OK     HTTP ' + code + '                ' + t.from); }
      else                           { failed++; Logger.log('FAIL   HTTP ' + code + '                ' + t.from); }
    } catch (e) {
      failed++;
      Logger.log('ERROR  ' + e + '  ' + t.from);
    }
    Utilities.sleep(400); // be polite to unsubscribe endpoints
  });

  Logger.log('');
  if (DRY_RUN) {
    Logger.log('DRY RUN — nothing was sent. Set DRY_RUN = false and run again.');
  } else {
    Logger.log('Unsubscribed: ' + ok + '   Failed: ' + failed + '   Skipped: ' + skipped);
  }
  Logger.log('Senders with no List-Unsubscribe header are non-compliant —');
  Logger.log('block those with a Gmail filter instead.');
}
