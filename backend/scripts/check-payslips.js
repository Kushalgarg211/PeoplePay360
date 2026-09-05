require('dotenv').config();
const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  const [slips] = await c.execute(`
    SELECT p.id, e.first_name, e.last_name, con.wage_per_month,
           p.basic_salary, p.gross_salary, p.net_salary, p.warnings
    FROM payslips p
    JOIN employees e  ON e.id = p.employee_id
    JOIN contracts con ON con.id = p.contract_id
    WHERE p.status = 'Done'
  `);
  for (const s of slips) {
    console.log('\n' + s.first_name + ' ' + s.last_name + ' (CTC: Rs' + s.wage_per_month + ')');
    console.log('  Basic : Rs' + s.basic_salary);
    console.log('  Gross : Rs' + s.gross_salary);
    console.log('  Net   : Rs' + s.net_salary);
    if (s.warnings) console.log('  Warns : ' + s.warnings);
    const [lines] = await c.execute('SELECT code,amount,category FROM payslip_lines WHERE payslip_id=? ORDER BY category', [s.id]);
    lines.forEach(l => console.log('  ' + l.code.padEnd(6) + ': Rs' + l.amount + ' [' + l.category + ']'));
  }
  await c.end();
})();