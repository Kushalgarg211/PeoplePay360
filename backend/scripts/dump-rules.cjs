const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const structures = await prisma.salaryStructure.findMany({
    include: { rules: { orderBy: { sequence: 'asc' } } }
  });
  console.log(JSON.stringify(structures, null, 2));
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
