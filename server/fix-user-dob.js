// Quick script to fix the user's DOB in the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUserDOB() {
  try {
    const email = 'brighttina2002@gmail.com';
    const correctDOB = '2002-10-26';
    
    console.log(`Fixing DOB for user: ${email}`);
    console.log(`Setting DOB to: ${correctDOB}`);
    
    const user = await prisma.user.update({
      where: { email },
      data: {
        dateOfBirth: new Date(correctDOB + 'T00:00:00Z'),
        firstName: 'Bright Tinashe',
        lastName: 'Sibanda',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
      },
    });
    
    console.log('✅ User updated successfully:');
    console.log(JSON.stringify(user, null, 2));
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating user:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixUserDOB();
