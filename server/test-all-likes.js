// Test likes for all users
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAllLikes() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    
    console.log('=== Testing Likes for All Users ===\n');
    
    for (const user of users) {
      console.log(`\n━━━ ${user.firstName} ${user.lastName} (${user.email}) ━━━`);
      
      // Who they liked
      const sentLikes = await prisma.swipe.findMany({
        where: {
          swiperId: user.id,
          action: { in: ['LIKE', 'SUPERLIKE'] },
        },
        include: {
          swiped: { select: { firstName: true, lastName: true } }
        }
      });
      
      console.log(`\n📤 They LIKED ${sentLikes.length} people:`);
      sentLikes.forEach(s => {
        console.log(`   - ${s.swiped.firstName} ${s.swiped.lastName}`);
      });
      
      // Who liked them
      const receivedLikes = await prisma.swipe.findMany({
        where: {
          swipedId: user.id,
          action: { in: ['LIKE', 'SUPERLIKE'] },
        },
        include: {
          swiper: { select: { firstName: true, lastName: true } }
        }
      });
      
      console.log(`\n📥 ${receivedLikes.length} people LIKED them:`);
      receivedLikes.forEach(s => {
        console.log(`   - ${s.swiper.firstName} ${s.swiper.lastName}`);
      });
      
      // Check for matches
      const matches = await prisma.match.findMany({
        where: {
          OR: [
            { user1Id: user.id },
            { user2Id: user.id }
          ],
          isActive: true
        },
        include: {
          user1: { select: { firstName: true, lastName: true } },
          user2: { select: { firstName: true, lastName: true } }
        }
      });
      
      console.log(`\n💕 ${matches.length} MATCHES:`);
      matches.forEach(m => {
        const other = m.user1Id === user.id ? m.user2 : m.user1;
        console.log(`   - ${other.firstName} ${other.lastName}`);
      });
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

testAllLikes();
