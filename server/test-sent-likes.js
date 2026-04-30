// Test the sent-likes query directly
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSentLikes() {
  try {
    const bright = await prisma.user.findUnique({
      where: { email: 'brighttina2002@gmail.com' },
      select: { id: true, firstName: true }
    });
    
    if (!bright) {
      console.log('User not found');
      return;
    }
    
    console.log(`Testing sent-likes for: ${bright.firstName}`);
    console.log(`User ID: ${bright.id}\n`);
    
    // This is exactly what the endpoint does
    const sentLikes = await prisma.swipe.findMany({
      where: {
        swiperId: bright.id,
        action: { in: ['LIKE', 'SUPERLIKE'] },
      },
      include: {
        swiped: {
          include: {
            photos: { orderBy: { order: 'asc' } },
            verification: { select: { isVerified: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    
    console.log(`Found ${sentLikes.length} sent likes\n`);
    
    if (sentLikes.length > 0) {
      console.log('=== Sent Likes ===');
      sentLikes.forEach(swipe => {
        console.log(`\n${swipe.swiped.firstName} ${swipe.swiped.lastName || ''}`);
        console.log(`  ID: ${swipe.swiped.id}`);
        console.log(`  Age: ${calculateAge(swipe.swiped.dateOfBirth)}`);
        console.log(`  Bio: ${swipe.swiped.bio || 'No bio'}`);
        console.log(`  Photos: ${swipe.swiped.photos.length}`);
        console.log(`  Verified: ${swipe.swiped.verification?.isVerified || false}`);
        console.log(`  Liked at: ${swipe.createdAt}`);
      });
      
      // Show what the API would return
      console.log('\n=== API Response ===');
      const response = sentLikes.map((swipe) => ({
        id: swipe.swiped.id,
        firstName: swipe.swiped.firstName,
        age: calculateAge(swipe.swiped.dateOfBirth),
        bio: swipe.swiped.bio,
        photos: swipe.swiped.photos.map(p => p.url),
        isVerified: swipe.swiped.verification?.isVerified || false,
        likedAt: swipe.createdAt,
      }));
      console.log(JSON.stringify(response, null, 2));
    } else {
      console.log('No sent likes found');
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

testSentLikes();
