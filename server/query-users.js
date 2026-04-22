#!/usr/bin/env node
/**
 * Query all users or specific email from TrustMatch DB
 * Usage: node server/query-users.js [email]
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function queryUsers(email = null) {
  try {
    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          verification: true,
          photos: true,
        }
      });
      if (user) {
        console.log('👤 User found:', {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          verification: user.verification,
          photosCount: user.photos.length,
        });
      } else {
        console.log('❌ User not found:', email);
      }
    } else {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          status: true,
        },
        take: 10,
      });
      console.log('📋 Recent users:', users);
    }
  } catch (error) {
    console.error('💥 Query failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];
queryUsers(email);
