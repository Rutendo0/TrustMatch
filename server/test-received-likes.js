// Test the received-likes (who likes you) query
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testReceivedLikes() {
  try {
    const bright = await prisma.user.findUnique({
      where: { email: 'brighttina2002@gmail.com' },
      select: { id: true, firstName: true }
    });
    
    if (!bright) {
      console.log('User not found');
      return;
    }
    
    console.log(`Testing received-likes for: ${bright.firstName}`);
    console.log(`User ID: ${bright.id}\n`);
    
    // Find all users who have swiped LIKE on Bright
    const likedMe = await prisma.swipe.findMany({
      where: {
        swipedId: bright.id,
        action: { in: ['LIKE', 'SUPERLIKE'] },
      },
      include: {
        swiper: {
          include: {
            photos: { orderBy: { order: 'asc' } },
            verification: { select: { isVerified: true } },
          },
        },
      },
      take: 20,
    });
    
    console.log(`Found ${likedMe.length} people who liked ${bright.firstName}\n`);
    
    if (likedMe.length > 0) {
      // Get Bright's swipes to filter out
      const mySwipes = await prisma.swipe.findMany({
        where: { swiperId: bright.id },
        select: { swipedId: true },
      });
      const mySwipedIds = new Set(mySwipes.map(s => s.swipedId));
      
      console.log(`${bright.firstName} has swiped on ${mySwipes.length} people\n`);
      
      // Filter to only show users who liked me and I haven't swiped yet
      const mutualLikes = likedMe.filter(swipe => !mySwipedIds.has(swipe.swiperId));
      
      console.log(`After filtering: ${mutualLikes.length} people (who liked but not swiped back yet)\n`);
      
      console.log('=== All People Who Liked You ===');
      likedMe.forEach(swipe => {
        const alreadySwiped = mySwipedIds.has(swipe.swiperId);
        console.log(`\n${swipe.swiper.firstName} ${swipe.swiper.lastName || ''}`);
        console.log(`  ID: ${swipe.swiper.id}`);
        console.log(`  Age: ${calculateAge(swipe.swiper.dateOfBirth)}`);
        console.log(`  Photos: ${swipe.swiper.photos.length}`);
        console.log(`  Verified: ${swipe.swiper.verification?.isVerified || false}`);
        console.log(`  Liked at: ${swipe.createdAt}`);
        console.log(`  Already swiped back: ${alreadySwiped ? 'YES (filtered out)' : 'NO (will show)'}`);
      });
      
      if (mutualLikes.length > 0) {
        console.log('\n=== API Response (What User Sees) ===');
        const response = mutualLikes.map((swipe) => ({
          id: swipe.swiper.id,
          firstName: swipe.swiper.firstName,
          age: calculateAge(swipe.swiper.dateOfBirth),
          bio: swipe.swiper.bio,
          photos: swipe.swiper.photos.map(p => p.url),
          isVerified: swipe.swiper.verification?.isVerified || false,
          likedAt: swipe.createdAt,
        }));
        console.log(JSON.stringify(response, null, 2));
      } else {
        console.log('\n❌ No profiles to show in "Who Likes You" tab');
        console.log('Reason: You already swiped on everyone who liked you');
      }
    } else {
      console.log('❌ No one has liked you yet');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return 25;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

testReceivedLikes();
