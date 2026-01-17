# Expense Tracker

A modern, responsive expense tracking application built with React, TypeScript, and Firebase.

## Features

- ✅ **Google Authentication** - Secure login with Google SSO
- ✅ **Period-based Tracking** - Organize expenses by time periods (monthly halves)
- ✅ **Real-time Sync** - Data synchronized across devices via Firebase
- ✅ **Modern UI** - Clean, dark-themed interface with Tailwind CSS
- ✅ **Expense Management** - Add, edit, and delete expenses with ease
- ✅ **Automatic Templates** - Carry over expenses from previous periods
- ✅ **Toast Notifications** - Beautiful, non-intrusive notifications
- ✅ **Responsive Design** - Works perfectly on desktop and mobile

## Setup

### Prerequisites

- Node.js 18+ and pnpm
- Firebase project with Firestore and Authentication enabled

### Environment Variables

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase configuration in `.env`:
   ```env
   # Firebase Configuration (get from Firebase Console)
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

   # Authorized Emails (comma-separated)
   VITE_AUTHORIZED_EMAILS=your-email@example.com,admin@example.com
   ```

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build
```

### Firebase Setup

1. **Create a Firebase project** at [Firebase Console](https://console.firebase.google.com/)
2. **Enable Authentication** with Google provider
3. **Enable Firestore** database
4. **Deploy security rules**:
   ```bash
   firebase login
   firebase use your-project-id
   firebase deploy --only firestore:rules
   ```

## Project Structure

```
src/
├── components/
│   ├── ui/           # Reusable UI components (shadcn/ui)
│   ├── Dashboard.tsx # Main expense tracking interface
│   ├── Login.tsx     # Authentication component
│   └── ConfirmDialog.tsx # Custom confirmation dialogs
├── config/
│   └── auth.ts       # Authentication configuration
├── hooks/
│   └── use-toast.ts  # Toast notification hook
├── utils/
│   └── cn.ts         # Class name utility
├── firebase.ts       # Firebase configuration
├── types.ts          # TypeScript type definitions
└── App.tsx           # Main application component
```

## Security

- **Email Whitelisting**: Only authorized email addresses can access the app
- **Firebase Security Rules**: Database access is properly restricted
- **Environment Variables**: Sensitive configuration is stored securely

## Development

### Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build
- `pnpm run lint` - Run ESLint

### Environment Setup

Create a `.env` file with your Firebase configuration:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Authorized Emails (comma-separated)
VITE_AUTHORIZED_EMAILS=your-email@example.com
```

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Firebase (Authentication, Firestore)
- **State Management**: React hooks
- **Build Tool**: Vite with SWC compiler
