// Quick database connection test
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
    
    // Try to connect and run a simple query
    await prisma.$connect();
    console.log('✅ Database connected successfully!');
    
    // Try a simple query
    const userCount = await prisma.user.count();
    console.log(`✅ Query successful! Found ${userCount} users in database.`);
    
    await prisma.$disconnect();
    console.log('✅ Database connection test passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error.message);
    console.error('\nPossible causes:');
    console.error('1. Database server is down or unreachable');
    console.error('2. Neon database is paused (free tier pauses after inactivity)');
    console.error('3. Invalid connection string');
    console.error('4. Network/firewall blocking connection');
    console.error('\nSolution: Check your Neon dashboard at https://console.neon.tech');
    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();
