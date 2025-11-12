const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Create test participants
  const participants = [
    { participantId: 'P001', condition: 'switching' },
    { participantId: 'P002', condition: 'non_switching' },
    { participantId: 'P003', condition: 'switching' },
    { participantId: 'P004', condition: 'non_switching' },
  ];

  for (const participant of participants) {
    const user = await prisma.user.upsert({
      where: { participantId: participant.participantId },
      update: {},
      create: participant,
    });
    console.log(`✅ Created participant: ${user.participantId} (${user.condition})`);
  }

  console.log('\n✨ Seeding completed!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
