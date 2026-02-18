// Database seed script for development and testing
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Starting database seed...');

  // No seed data needed for MVP
  // Add seed data here when needed for development/testing

  console.log('Seed complete (no seed data for MVP)');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
