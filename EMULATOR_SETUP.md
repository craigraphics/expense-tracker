# 🔥 Firebase Emulator Setup

## 🚀 Quick Start

### 1. Start the Emulators
```bash
pnpm run emulators
```

This starts:
- **Auth Emulator**: http://localhost:9099
- **Firestore Emulator**: http://localhost:8080
- **Emulator UI**: http://localhost:4000

### 2. Start Your App
```bash
pnpm run dev
```

Your app will automatically connect to the emulators when running on localhost.

## 📱 Phone Authentication with Emulator

### How It Works:
- ✅ **Any phone number** works (no real SMS sent)
- ✅ **Verification code is always**: `123456`
- ✅ **No billing required**
- ✅ **No Firebase Console configuration needed**

### Example Usage:
1. Enter any phone number: `+1234567890`
2. Click "Send Code"
3. Enter verification code: `123456`
4. You're logged in!

## 🛑 Stop the Emulators

Press `Ctrl+C` in the terminal running the emulators.

## 🔧 Manual Commands

```bash
# Start all emulators
firebase emulators:start

# Start only auth emulator
firebase emulators:start --only auth

# Start with specific ports
firebase emulators:start --only auth --port 9099
```

## 📊 Emulator UI

Visit http://localhost:4000 to see:
- Authentication data
- Firestore data
- Emulator logs
- Test phone numbers (automatically configured)

## 🔄 Switching Between Emulator and Production

The app automatically detects the environment:
- **Development/Localhost**: Uses emulators
- **Production**: Uses real Firebase

## 🐛 Troubleshooting

### Emulator Won't Start:
```bash
# Kill any existing processes
pkill -f firebase
pkill -f java

# Try again
pnpm run emulators
```

### App Won't Connect:
- Make sure emulators are running first
- Check console for connection errors
- Refresh the app page

### Port Conflicts:
Edit `firebase.json` to use different ports if needed.

## 🎯 Benefits

- ✅ **No SMS costs** during development
- ✅ **Fast authentication** (no network delays)
- ✅ **Offline development** possible
- ✅ **Test multiple accounts** easily
- ✅ **No Firebase Console setup** required