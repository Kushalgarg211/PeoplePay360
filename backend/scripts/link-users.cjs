const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get all users without employee link
  const users = await prisma.user.findMany({
    where: { employeeId: null },
    select: { id: true, email: true, role: true }
  });
  console.log('Unlinked users:', JSON.stringify(users, null, 2));

  // Get all employees
  const emps = await prisma.employee.findMany({
    select: { id: true, workEmail: true, firstName: true, lastName: true }
  });
  console.log('Employees:', JSON.stringify(emps, null, 2));

  // Auto-link by email match
  for (const u of users) {
    const emp = emps.find(e => e.workEmail && e.workEmail.toLowerCase() === u.email.toLowerCase());
    if (emp) {
      await prisma.user.update({ where: { id: u.id }, data: { employeeId: emp.id } });
      console.log(`Linked: ${u.email} -> ${emp.firstName} ${emp.lastName} (${emp.id})`);
    } else {
      console.log(`No employee match for: ${u.email}`);
    }
  }

  return prisma.user.disconnect ? prisma.user.disconnect() : null;
}

main()
  .then(() => { console.log('Done'); process.exit(0); })
  .catch(e => { console.error(e.message || e); process.exit(1); });
