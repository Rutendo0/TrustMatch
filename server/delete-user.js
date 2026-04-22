#!/usr/bin/env node
/**
 * Hard delete TrustMatch user by email + CASCADE cleanup
 * Usage: node server/delete-user.js brighttina2002@gmail.com
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteUser(email) {
  try {
    console.log(`🔍 Finding user: ${email}`);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true, lastName: true }
    });
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    console.log(`👤 Deleting user: ${user.firstName} ${user.lastName} (${user.id})`);
    
    // Hard delete with CASCADE (deletes related: photos, tokens, verification, etc.)
    await prisma.user.delete({
      where: { id: user.id }
    });
    
    console.log('✅ User & related data DELETED (cascade)');
    console.log('📊 Cascade deleted: refreshTokens, photos, verification, fingerprints, swipes, matches, etc.');
    
  } catch (error) {
    console.error('💥 Delete failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse args
const email = process.argv[2];
if (!email) {
  console.log('Usage: node server/delete-user.js brighttina2002@gmail.com');
  process.exit(1);
}

deleteUser(email);
