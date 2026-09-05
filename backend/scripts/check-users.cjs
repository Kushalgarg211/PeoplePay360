const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find all users with their employee links
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, employeeId: true },
    orderBy: { email: 'asc' }
  });
  console.log('All users:\n', JSON.stringify(users, null, 2));

  // Find employees that need linking
  const madhavEmp = await prisma.employee.findUnique({
    where: { id: '5635cb5f-3bb1-4d23-b25a-4c41fd7fa31b' },
    select: { id: true, firstName: true, lastName: true, workEmail: true }
  });
  console.log('Madhav employee:', JSON.stringify(madhavEmp));

  // Check if Madhav's employee is already linked to someone
  const linked = await prisma.user.findFirst({
    where: { employeeId: '5635cb5f-3bb1-4d23-b25a-4c41fd7fa31b' },
    select: { id: true, email: true }
  });
  console.log('Employee already linked to user:', JSON.stringify(linked));
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e.message); process.exit(1); });
