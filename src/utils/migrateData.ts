import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Utility to migrate data from old user account to new user account
 * Run this in browser console after logging in with both accounts
 */

export const migrateUserData = async (oldUserId: string, newUserId: string) => {
  console.log('🚀 Starting data migration...');
  console.log('From user:', oldUserId);
  console.log('To user:', newUserId);

  try {
    // Get all periods from old user
    const oldUserPeriodsRef = collection(db, 'users', oldUserId, 'periods');
    const oldUserPeriods = await getDocs(oldUserPeriodsRef);

    console.log(`Found ${oldUserPeriods.docs.length} periods to migrate`);

    // Migrate each period
    for (const periodDoc of oldUserPeriods.docs) {
      const periodId = periodDoc.id;
      const periodData = periodDoc.data();

      console.log(`Migrating period: ${periodId}`);

      // Create the period in new user account
      const newPeriodRef = doc(db, 'users', newUserId, 'periods', periodId);
      await setDoc(newPeriodRef, periodData);

      console.log(`✅ Migrated period: ${periodId}`);
    }

    console.log('🎉 Data migration completed successfully!');
    console.log(`Migrated ${oldUserPeriods.docs.length} periods`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

// Helper function to get current user's periods
export const listUserPeriods = async (userId: string) => {
  try {
    const periodsRef = collection(db, 'users', userId, 'periods');
    const periods = await getDocs(periodsRef);

    console.log(`User ${userId} has ${periods.docs.length} periods:`);
    periods.docs.forEach(doc => {
      console.log(`- ${doc.id}`);
    });

    return periods.docs.map(doc => doc.id);
  } catch (error) {
    console.error('Error listing periods:', error);
    return [];
  }
};

// Usage instructions
export const MIGRATION_INSTRUCTIONS = `
🔄 DATA MIGRATION INSTRUCTIONS

1. Log in with your NEW Google account (current session)
2. Open browser console (F12)
3. Run this to see your new user ID:
   console.log(auth.currentUser.uid)

4. Note down your OLD user ID (from phone auth)
   - You might need to check Firebase Console or local storage

5. Run the migration:
   import { migrateUserData } from './src/utils/migrateData.ts';
   migrateUserData('OLD_USER_ID', 'NEW_USER_ID');

6. Verify the data migrated:
   import { listUserPeriods } from './src/utils/migrateData.ts';
   listUserPeriods('NEW_USER_ID');
`;