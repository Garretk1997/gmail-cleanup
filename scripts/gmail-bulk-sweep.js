/*
 * gmail-bulk-sweep.js — bulk archive/delete in Gmail from the browser console.
 *
 * WHY THIS EXISTS
 * The Gmail API modifies one thread per call. At 50,000 threads that is 50,000
 * calls. Gmail's own "Select all conversations that match this search" does the
 * whole set in one action — this drives that.
 *
 * THE TWO TRAPS THIS SOLVES (both cost me hours)
 *
 *  1. Changing the search with `location.hash` leaves the message list STALE.
 *     Old rows keep rendering, clicks land on the wrong message, and the
 *     Archive button never appears — while your code happily reports success.
 *     FIX: do a real page load (set location.href, or paste the URL), wait,
 *     THEN sweep. That is why this script is "navigate, then run".
 *
 *  2. Gmail ignores a plain el.click() on its list controls. It listens for a
 *     full pointer/mouse event sequence. FIX: rc() below.
 *
 * VERIFY WITH THE API, NOT THE ROW COUNT. The UI will happily show ~49 stale
 * rows for a query the Gmail API reports as completely empty.
 *
 * USAGE
 *   1. Navigate to your search in Gmail (a real page load, not an in-app click).
 *   2. Open DevTools console, paste this file.
 *   3. sweep('Archive')   // or sweep('Delete')  -> Delete means Trash (30-day undo)
 *
 * Re-run until it returns {status:'CLEAN'}. Always confirm with an API query.
 */

function rc(el) {
  const r = el.getBoundingClientRect();
  const o = { bubbles: true, cancelable: true, view: window,
              clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
              button: 0, buttons: 1, isPrimary: true, pointerId: 1 };
  el.dispatchEvent(new PointerEvent('pointerdown', o));
  el.dispatchEvent(new MouseEvent('mousedown', o));
  el.dispatchEvent(new PointerEvent('pointerup', { ...o, buttons: 0 }));
  el.dispatchEvent(new MouseEvent('mouseup', { ...o, buttons: 0 }));
  el.dispatchEvent(new MouseEvent('click', { ...o, buttons: 0 }));
}

const wait = ms => new Promise(r => setTimeout(r, ms));

async function sweep(action = 'Archive') {
  const rows = document.querySelectorAll('tr.zA').length;
  if (!rows) return { rows: 0, status: 'CLEAN' };

  // The first [role=checkbox] in the DOM is a zero-size hidden node.
  // Only take ones that are actually rendered near the top toolbar.
  const cbs = [...document.querySelectorAll('[role="checkbox"]')]
    .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.top < 200; });
  if (!cbs.length) return { rows, status: 'NO-CHECKBOX (stale page? reload it)' };

  rc(cbs[0]);
  await wait(2500);

  // Only appears when the result set exceeds one page (~50).
  const all = [...document.querySelectorAll('span')]
    .find(e => e.textContent.trim() === 'Select all conversations that match this search');
  if (all) { rc(all); await wait(2000); }

  const btn = [...document.querySelectorAll('div[role="button"]')]
    .filter(b => b.getAttribute('aria-label') === action)
    .find(b => b.getBoundingClientRect().width > 0);
  if (!btn) return { rows, status: `NO-${action.toUpperCase()}-BUTTON (stale page? reload it)` };

  rc(btn);
  await wait(2500);

  const dlg = document.querySelector('div[role="alertdialog"], div[role="dialog"]');
  const ok = dlg && [...dlg.querySelectorAll('button, div[role="button"]')]
    .find(b => /^OK$/i.test(b.textContent.trim()));
  if (ok) rc(ok);
  await wait(3000);

  return { rows, bulk: !!all, confirmed: !!ok, status: 'DONE' };
}

console.log('Loaded. Run:  await sweep("Archive")   or   await sweep("Delete")');
