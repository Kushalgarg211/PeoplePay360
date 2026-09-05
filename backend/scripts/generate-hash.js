// PeoplePay360 — Password Hash Generator Run: node scripts/generate-hash.js Paste the printed UPDATE statements into MySQL Workbench and execute.
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;
const PASSWORD    = 'Password@123';

const USER_IDS = [
  'u100000000000000000000000000000001',
  'u100000000000000000000000000000002',
  'u100000000000000000000000000000003',
  'u100000000000000000000000000000004',
  'u100000000000000000000000000000005',
];

(async () => {
  const hash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  console.log('\n');
  console.log('-- Paste these UPDATE statements in MySQL Workbench');
  console.log('\n');
  console.log('USE peoplepay360;\n');
  for (const id of USER_IDS) {
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE id = '${id}';`);
  }
  console.log('\n-- Done. All user passwords are now: Password@123');
})();
