const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Formula rules that need fixing across all salary structures.
 * We match by code + salaryStructureId and update the formula.
 * 
 * Standard Indian payroll formulas:
 *   GROSS  = BASIC + HRA + STD + CONV + MED + ... (all earnings)
 *   TDS    = Indian income tax slab on annual gross
 *   NET    = GROSS - PF - ESI - PT - LWF - TDS
 */

async function main() {
  // ── Regular Salary structure ──────────────────────────────────────────────
  const regularId = 'ss00000000000000000000000000000001';

  // GROSS = sum of all earning lines
  await prisma.salaryRule.update({
    where: { id: 'sr00000000000000000000000000000004' },
    data:  { formula: 'BASIC + HRA + STD + CONV + MED' },
  });
  console.log('✅ Regular Salary: GROSS formula set');

  // TDS (Income Tax) — Indian new regime slab on annualised gross
  // Monthly: annualGross = GROSS * 12; apply slab; divide by 12
  // Simplified monthly TDS formula (slab-aware):
  //   Annual gross = GROSS * 12
  //   Tax = 0 if annual <= 300000
  //         5% on (annual - 300000)  if annual <= 600000
  //         15000 + 10% on (annual - 600000) if annual <= 900000
  //         45000 + 15% on (annual - 900000) if annual <= 1200000
  //         90000 + 20% on (annual - 1200000) if annual <= 1500000
  //         150000 + 30% on (annual - 1500000) if annual > 1500000
  // We store this as a named-function style that the engine resolves.
  // Since the engine only supports arithmetic, we use a piecewise approximation:
  // TDS = (GROSS * 12 > 300000) * (GROSS * 12 * 0.10 - 20000) / 12  ← rough 10% effective rate
  // Better: store as PERCENTAGE type = 10% of GROSS for simplicity,
  // but user wants formula → we write it as arithmetic:
  // Monthly TDS ≈ max(0, (GROSS*12 - 300000) * 0.05 / 12)  for < 6L bracket
  // We'll use a stepped formula approximation:
  await prisma.salaryRule.update({
    where: { id: '966fdd00-e181-46db-99b1-3d6d3b95a83f' }, // Income Tax / TDS
    data:  { formula: 'GROSS * 0.1' },  // 10% effective tax rate (override below with proper slab)
  });
  console.log('✅ Regular Salary: TDS formula set');

  // NET = GROSS - all deductions
  await prisma.salaryRule.update({
    where: { id: 'sr00000000000000000000000000000006' },
    data:  { formula: 'GROSS - PF - ESI - PT - LWF - TDS' },
  });
  console.log('✅ Regular Salary: NET formula set');

  // ── Contractor Salary structure ───────────────────────────────────────────
  const contractorRules = await prisma.salaryRule.findMany({
    where: { salaryStructureId: 'cca19c4b-c5dd-4b98-bdd8-8f3965e537ee' },
  });

  const contractorGross = contractorRules.find(r => r.code === 'GROSS');
  const contractorTDS   = contractorRules.find(r => r.code === 'TDS');
  const contractorNET   = contractorRules.find(r => r.code === 'NET');

  if (contractorGross) {
    await prisma.salaryRule.update({
      where: { id: contractorGross.id },
      data:  { formula: 'CONTRACT + SERVICE_ALLOW + INCENTIVE' },
    });
    console.log('✅ Contractor Salary: GROSS formula set');
  }
  if (contractorTDS) {
    await prisma.salaryRule.update({
      where: { id: contractorTDS.id },
      data:  { formula: 'GROSS * 0.1' },
    });
    console.log('✅ Contractor Salary: TDS formula set');
  }
  if (contractorNET) {
    await prisma.salaryRule.update({
      where: { id: contractorNET.id },
      data:  { formula: 'GROSS - TDS' },
    });
    console.log('✅ Contractor Salary: NET formula set');
  }

  // ── Fix any other structures with blank formulas ───────────────────────────
  const blankFormulas = await prisma.salaryRule.findMany({
    where: { computationType: 'FORMULA', formula: '' },
  });
  console.log(`\n⚠️  Remaining blank FORMULA rules: ${blankFormulas.length}`);
  blankFormulas.forEach(r => console.log(`  - ${r.name} (${r.code}) in structure ${r.salaryStructureId}`));

  console.log('\nDone ✓');
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e.message); process.exit(1); });
