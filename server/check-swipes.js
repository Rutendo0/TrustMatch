// Check Bright's swipes
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSwipes() {
  try {
    const bright = await prisma.user.findUnique({
      where: { email: 'brighttina2002@gmail.com' },
      select: { id: true, firstName: true, interestedIn: true }
    });
    
    if (!bright) {
      console.log('User not found');
      return;
    }
    
    console.log(`${bright.firstName} is interested in: ${bright.interestedIn}`);
    console.log(`User ID: ${bright.id}\n`);
    
    const swipes = await prisma.swipe.findMany({
      where: { swiperId: bright.id },
      include: {
        swiped: {
          select: { firstName: true, lastName: true, gender: true }
        }
      }
    });
    
    console.log(`Total swipes: ${swipes.length}\n`);
    
    if (swipes.length > 0) {
      console.log('=== Swipe History ===');
      swipes.forEach(swipe => {
        console.log(`${swipe.action} - ${swipe.swiped.firstName} ${swipe.swiped.lastName} (${swipe.swiped.gender})`);
      });
    } else {
      console.log('No swipes yet');
    }
    
    // Check available profiles
    const availableProfiles = await prisma.user.findMany({
      where: {
        id: { not: bright.id },
        gender: bright.interestedIn,
        isActive: true,
        verification: { isVerified: true }
      },
      select: { firstName: true, lastName: true, gender: true }
    });
    
    console.log(`\n=== Available Profiles (${availableProfiles.length}) ===`);
    availableProfiles.forEach(p => {
      console.log(`${p.firstName} ${p.lastName} (${p.gender})`);
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkSwipes();
