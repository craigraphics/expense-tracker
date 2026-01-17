# 🔄 Migrate Data from Phone Auth to Google Auth

## 🚨 **Important:**
Your data didn't disappear! You just have a new user account with Google SSO. We need to copy your data from the old phone auth account to the new Google account.

## 📋 **Step-by-Step Migration:**

### **Step 1: Find Your User IDs**

#### **New User ID (Google Account):**
1. Log in with your Google account
2. Open browser console (F12 → Console tab)
3. Run: `console.log(auth.currentUser.uid)`
4. **Copy the ID** - this is your `NEW_USER_ID`

#### **Old User ID (Phone Account):**
You have a few options:

**Option A: Check Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Go to **Firestore Database**
3. Look for documents under `/users/`
4. The document ID is your old user ID

**Option B: Check Local Storage (if available)**
- Check browser localStorage for Firebase auth data

**Option C: Ask me to help identify it**

### **Step 2: Run Migration Script**

#### **Method 1: Browser Console (Recommended)**

1. **Stay logged in** with your Google account
2. **Open browser console** (F12)
3. **Copy and paste** this entire script:

```javascript
// Migration script - copy everything between the === markers
// ================================================================

// Replace these with your actual user IDs
const OLD_USER_ID = 'REPLACE_WITH_OLD_USER_ID';
const NEW_USER_ID = 'REPLACE_WITH_NEW_USER_ID'; // From console.log(auth.currentUser.uid)

async function migrateData() {
  console.log('🚀 Starting migration...');

  try {
    // Get all periods from old user
    const oldPeriodsRef = firebase.firestore().collection('users').doc(OLD_USER_ID).collection('periods');
    const oldPeriods = await oldPeriodsRef.get();

    console.log(`Found ${oldPeriods.docs.length} periods to migrate`);

    // Migrate each period
    for (const periodDoc of oldPeriods.docs) {
      const periodId = periodDoc.id;
      const periodData = periodDoc.data();

      console.log(`Migrating: ${periodId}`);

      // Create in new user account
      await firebase.firestore()
        .collection('users')
        .doc(NEW_USER_ID)
        .collection('periods')
        .doc(periodId)
        .set(periodData);

      console.log(`✅ Migrated: ${periodId}`);
    }

    console.log('🎉 Migration complete! Refresh the page.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('Make sure both user IDs are correct and you have internet connection.');
  }
}

// Run the migration
migrateData();

// ================================================================
```

4. **Replace the user IDs** in the script:
   - `OLD_USER_ID`: Your phone auth user ID
   - `NEW_USER_ID`: The ID you got from console.log

5. **Press Enter** to run the script

### **Step 3: Verify Migration**

After running the script:
1. **Refresh the page**
2. **Check if your expense data appears**
3. **Verify all periods are there**

---

## 🔍 **Alternative: Firebase Console Method**

If the script doesn't work:

1. **Go to Firebase Console** → **Firestore Database**
2. **Find your old user data** under `/users/OLD_USER_ID/periods/`
3. **Copy each period document**
4. **Paste them under** `/users/NEW_USER_ID/periods/`

---

## 🆘 **Need Help Finding User IDs?**

If you can't find your old user ID:

1. **Check browser console** after running the app
2. **Look for any Firebase auth logs**
3. **Check Firebase Console** → Authentication → Users
4. **Ask me** and I can help you identify it

---

## ✅ **After Migration:**

- ✅ All your expense periods will appear
- ✅ All expense data will be intact
- ✅ You can continue using the app normally
- ❌ Old phone account data will still exist (you can delete it later if wanted)

---

## 🚨 **Safety Notes:**

- ✅ **No data loss** - we copy, don't move
- ✅ **Reversible** - you can run again if needed
- ✅ **Safe** - doesn't affect other users

---

**Ready to migrate? Get your user IDs and run the script!** 🎯