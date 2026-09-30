/**
 * setup-labels.gs — create the label tree the filters expect.
 *
 * Run this BEFORE importing the filter XMLs.
 *
 * HOW TO RUN (no install, no credentials)
 *   1. Go to https://script.google.com  ->  New project
 *   2. Paste this whole file in, replacing what's there
 *   3. Click Run. Approve the one-time permission prompt (it's your own account)
 *   4. Check the log — it lists every label created
 *
 * Safe to re-run: existing labels are left alone.
 */

const LABELS = [
  '🔐 Security',
  '💰 Money',
  '💰 Money/Banking',
  '💰 Money/Receipts',
  '💰 Money/Invoices',
  '💰 Money/Subscriptions',
  '💰 Money/Taxes',
  '💼 Job Search',
  '💼 Job Search/Applications',
  '💼 Job Search/Interviews',
  '💼 Job Search/Recruiters',
  '💼 Job Search/Job Alerts',
  '👥 Clients & Leads',
  '🛠 Tools & Infra',
  '🛍 Shopping & Orders',
  '🏠 Home & Local',
  '📰 Newsletters',
];

function setupLabels() {
  let created = 0, existed = 0;
  LABELS.forEach(name => {
    if (GmailApp.getUserLabelByName(name)) {
      existed++;
      Logger.log('exists   ' + name);
    } else {
      GmailApp.createLabel(name);
      created++;
      Logger.log('CREATED  ' + name);
    }
  });
  Logger.log('\nDone. Created ' + created + ', already present ' + existed + '.');
  Logger.log('Now import the filter XMLs in Gmail Settings -> Filters -> Import filters.');
}
