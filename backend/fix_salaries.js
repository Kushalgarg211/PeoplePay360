const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Fix Intern Salary
  const internStruct = await prisma.salaryStructure.findFirst({ where: { name: 'Intern Salary' } });
  if (internStruct) {
    const grossRule = await prisma.salaryRule.findFirst({ where: { salaryStructureId: internStruct.id, code: 'GROSS' } });
    if (grossRule) {
      await prisma.salaryRule.update({
        where: { id: grossRule.id },
        data: { sequence: 20, formula: 'BASIC_STRIPEND' }
      });
      console.log('Fixed Intern GROSS rule');
    }
  }

  // Fix Regular Salary
  const regStruct = await prisma.salaryStructure.findFirst({ where: { name: 'Regular Salary' } });
  if (regStruct) {
    // Check if SPL already exists
    const existingSpl = await prisma.salaryRule.findFirst({ where: { salaryStructureId: regStruct.id, code: 'SPL' } });
    if (!existingSpl) {
      await prisma.salaryRule.create({
        data: {
          id: 'sr_spl_' + Date.now(),
          salaryStructureId: regStruct.id,
          name: 'Special Allowance',
          code: 'SPL',
          category: 'ALLOWANCE',
          sequence: 45,
          computationType: 'FORMULA',
          formula: 'WAGE - (BASIC + HRA + STD + CONV + MED)'
        }
      });
      console.log('Added Special Allowance rule');
    }
    
    // Update GROSS formula
    const regGross = await prisma.salaryRule.findFirst({ where: { salaryStructureId: regStruct.id, code: 'GROSS' } });
    if (regGross) {
      await prisma.salaryRule.update({
        where: { id: regGross.id },
        data: { formula: 'BASIC + HRA + STD + CONV + MED + SPL' }
      });
      console.log('Fixed Regular GROSS formula');
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
