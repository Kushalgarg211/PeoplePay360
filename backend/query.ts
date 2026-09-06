import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ss = await prisma.salaryStructure.findMany({
    include: { rules: { orderBy: { sequence: 'asc' } } }
  });
  console.log(JSON.stringify(ss, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
