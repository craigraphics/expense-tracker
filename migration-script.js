// 🔥 EXPENSE TRACKER DATA MIGRATION SCRIPT
// Copy this entire script and paste it into browser console (F12)

// REPLACE THESE WITH YOUR ACTUAL USER IDS:
const OLD_USER_ID = 'REPLACE_WITH_YOUR_OLD_USER_ID'; // Phone auth user ID
const NEW_USER_ID = 'REPLACE_WITH_YOUR_NEW_USER_ID'; // Google auth user ID (get from console.log(auth.currentUser.uid))

async function migrateExpenseData() {
  console.log('🚀 Starting expense data migration...');
  console.log('📱 From (phone auth):', OLD_USER_ID);
  console.log('🔥 To (Google auth):', NEW_USER_ID);

  if (OLD_USER_ID === 'REPLACE_WITH_YOUR_OLD_USER_ID' || NEW_USER_ID === 'REPLACE_WITH_YOUR_NEW_USER_ID') {
    console.error('❌ ERROR: You must replace the user IDs above with your actual IDs!');
    console.log('💡 Get NEW_USER_ID by running: console.log(auth.currentUser.uid)');
    console.log('💡 Find OLD_USER_ID in Firebase Console or ask for help');
    return;
  }

  try {
    // Get Firebase instance
    const db = firebase.firestore();

    // Get all periods from old user
    console.log('📂 Reading data from old account...');
    const oldPeriodsRef = db.collection('users').doc(OLD_USER_ID).collection('periods');
    const oldPeriodsSnapshot = await oldPeriodsRef.get();

    console.log(`📊 Found ${oldPeriodsSnapshot.docs.length} expense periods to migrate`);

    if (oldPeriodsSnapshot.docs.length === 0) {
      console.log('⚠️ No data found in old account. Migration complete (nothing to migrate).');
      return;
    }

    // Migrate each period
    let migratedCount = 0;
    for (const periodDoc of oldPeriodsSnapshot.docs) {
      const periodId = periodDoc.id;
      const periodData = periodDoc.data();

      console.log(`🔄 Migrating period: ${periodId} (${periodData.expenses?.length || 0} expenses)`);

      // Create the period in new user account
      const newPeriodRef = db.collection('users').doc(NEW_USER_ID).collection('periods').doc(periodId);
      await newPeriodRef.set(periodData);

      migratedCount++;
      console.log(`✅ Migrated period: ${periodId}`);
    }

    console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log(`📈 Migrated ${migratedCount} expense periods`);
    console.log('🔄 Refresh the page to see your data');

  } catch (error) {
    console.error('❌ MIGRATION FAILED:', error);
    console.log('🔧 Possible issues:');
    console.log('  - Wrong user IDs');
    console.log('  - No internet connection');
    console.log('  - Firebase permissions issue');
    console.log('  - Old account has no data');
  }
}

// Run the migration
migrateExpenseData();

// 📋 INSTRUCTIONS:
// 1. Replace OLD_USER_ID and NEW_USER_ID above
// 2. Copy this entire script
// 3. Paste into browser console (F12)
// 4. Press Enter
// 5. Refresh page to see migrated data