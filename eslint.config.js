import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // All writes must go through src/firestoreWrites.ts so read-only mode can block them
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'firebase/firestore',
          importNames: ['setDoc', 'deleteDoc', 'updateDoc', 'addDoc', 'writeBatch', 'runTransaction'],
          message: 'Import write helpers from src/firestoreWrites.ts instead.',
        }],
      }],
    },
  },
  {
    files: ['src/firestoreWrites.ts', 'src/utils/migrateData.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
])
