// Check how many verified users exist in the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProfiles() {
  try {
    // Count total users
    const totalUsers = await prisma.user.count();
    console.log(`Total users in database: ${totalUsers}`);
    
    // Count verified users
    const verifiedUsers = await prisma.user.count({
      where: {
        isActive: true,
        verification: { isVerified: true }
      }
    });
    console.log(`Verified users: ${verifiedUsers}`);
    
    // Get all users with their verification status
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        gender: true,
        isActive: true,
        status: true,
        verification: {
          select: {
            isVerified: true,
            emailVerified: true,
            idVerified: true,
            selfieVerified: true
          }
        }
      }
    });
    
    console.log('\n=== All Users ===');
    users.forEach(user => {
      console.log(`\n${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`  Gender: ${user.gender}`);
      console.log(`  Status: ${user.status}`);
      console.log(`  Active: ${user.isActive}`);
      console.log(`  Verified: ${user.verification?.isVerified || false}`);
      console.log(`  - Email: ${user.verification?.emailVerified || false}`);
      console.log(`  - ID: ${user.verification?.idVerified || false}`);
      console.log(`  - Selfie: ${user.verification?.selfieVerified || false}`);
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkProfiles();
