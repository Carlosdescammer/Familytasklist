/**
 * Check and fix encrypted notes in database
 */

import { db } from '../src/lib/db';
import { encryptedNotes, users, userKeys } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function checkNotes() {
  console.log('Checking encrypted notes...\n');

  // Get all users
  const allUsers = await db.select().from(users);
  console.log(`Total users: ${allUsers.length}`);
  allUsers.forEach(u => {
    console.log(`- ${u.name || u.email}: DB ID = ${u.id}, Clerk ID = ${u.clerkId}`);
  });

  console.log('\n---\n');

  // Get all encrypted notes
  const allNotes = await db.select().from(encryptedNotes);
  console.log(`Total encrypted notes: ${allNotes.length}`);

  if (allNotes.length > 0) {
    console.log('\nNotes:');
    allNotes.forEach((note, i) => {
      console.log(`${i + 1}. Note ID: ${note.id}`);
      console.log(`   User ID: ${note.userId}`);
      console.log(`   Title: ${note.title || '(no title)'}`);
      console.log(`   Type: ${note.noteType}`);
      console.log(`   Created: ${note.createdAt}`);
      console.log('');
    });

    // Check if notes have invalid user IDs
    console.log('\nChecking for orphaned notes (with invalid user IDs)...');
    for (const note of allNotes) {
      const user = allUsers.find(u => u.id === note.userId);
      if (!user) {
        console.log(`❌ Note ${note.id} has invalid userId: ${note.userId}`);
      } else {
        console.log(`✅ Note ${note.id} belongs to user: ${user.name || user.email}`);
      }
    }
  }

  console.log('\n---\n');

  // Get all user keys
  const allKeys = await db.select().from(userKeys);
  console.log(`Total user encryption keys: ${allKeys.length}`);

  if (allKeys.length > 0) {
    console.log('\nEncryption keys:');
    allKeys.forEach((key, i) => {
      const user = allUsers.find(u => u.id === key.userId);
      console.log(`${i + 1}. User: ${user?.name || user?.email || 'Unknown'} (${key.userId})`);
      console.log(`   Key version: ${key.keyVersion}`);
      console.log('');
    });
  }
}

checkNotes()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
