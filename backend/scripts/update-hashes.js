const mysql = require('mysql2/promise');
(async () => {
  try {
    const c = await mysql.createConnection('mysql://root:vilenop1234@localhost:3306/peoplepay360');
    const hash = '$2b$10$JSecbG4rMIScCkLKG2xgseOar8fThDpMeAsPwqRzCIhigKAedUPsa';
    const ids = [
      'u100000000000000000000000000000001',
      'u100000000000000000000000000000002',
      'u100000000000000000000000000000003',
      'u100000000000000000000000000000004',
      'u100000000000000000000000000000005',
    ];
    for (const id of ids) {
      await c.execute('UPDATE users SET password_hash=? WHERE id=?', [hash, id]);
    }
    const [rows] = await c.execute('SELECT email, LEFT(password_hash,20) AS hash_preview FROM users');
    console.table(rows);
    await c.end();
    console.log('Done - all passwords updated to: Password@123');
  } catch(e) {
    console.error('DB Error:', e.message);
  }
})();