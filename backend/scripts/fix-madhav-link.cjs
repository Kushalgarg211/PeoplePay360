const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // weeknd0079@gmail.com is Madhav's real login — link it to Madhav Sharma employee
  // First unlink the duplicate account (Madhav@gmail.com)
  await prisma.user.update({
    where: { id: '47c4f60a-f9eb-4779-af8a-97d9416a4e10' }, // Madhav@gmail.com
    data:  { employeeId: null }
  });
  console.log('Unlinked Madhav@gmail.com from employee');

  // Now link weeknd0079@gmail.com to Madhav Sharma
  const updated = await prisma.user.update({
    where: { email: 'weeknd0079@gmail.com' },
    data:  { employeeId: '5635cb5f-3bb1-4d23-b25a-4c41fd7fa31b' }
  });
  console.log('Linked weeknd0079@gmail.com to Madhav Sharma employee:', updated.employeeId);

  // Verify
  const check = await prisma.user.findMany({
    where: { email: { in: ['weeknd0079@gmail.com', 'Madhav@gmail.com'] } },
    select: { email: true, employeeId: true }
  });
  console.log('Verification:', JSON.stringify(check, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e.message); process.exit(1); });
