/**
 * Script: Link users to employees by matching email addresses
 * Run: npx ts-node scripts/link-employee-users.ts
 */
import prisma from '../src/config/database';

async function main() {
  const users = await prisma.user.findMany({
    where: { employeeId: null },
    select: { id: true, email: true, role: true },
  });

  console.log(`Found ${users.length} users without employeeId`);

  for (const user of users) {
    const employee = await prisma.employee.findFirst({
      where: { workEmail: { equals: user.email, mode: 'insensitive' } },
      select: { id: true, firstName: true, lastName: true },
    });

    if (employee) {
      await prisma.user.update({
        where: { id: user.id },
        data:  { employeeId: employee.id },
      });
      console.log(`✅ Linked ${user.email} -> ${employee.firstName} ${employee.lastName} (${employee.id})`);
    } else {
      console.log(`⚠️  No employee found for ${user.email}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
