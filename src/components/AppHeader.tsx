import React, { useEffect, useRef, useState } from 'react';
import { DatabaseBackup, LogOut, Moon, Sun } from 'lucide-react';
import { IconButton, Segmented } from './ui/primitives';
import { Logo } from './ui/Logo';

export type View = 'expenses' | 'analytics';

type Theme = 'dark' | 'light';

const readTheme = (): Theme => {
  try {
    return localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0c0c0e' : '#f4f4f5');
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Storage unavailable (private mode); the theme still applies for this visit
    }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))] as const;
};

interface AppHeaderProps {
  view: View;
  onViewChange: (view: View) => void;
  email: string | null;
  onSignOut: () => void;
  onBackup: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ view, onViewChange, email, onSignOut, onBackup }) => {
  const [theme, toggleTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuOpen]);

  const initial = (email?.[0] ?? '?').toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="hidden text-[15px] font-semibold tracking-tight text-fg sm:inline">Expense Tracker</span>
        </div>

        <Segmented
          className="ml-2 sm:ml-6"
          value={view}
          onChange={onViewChange}
          options={[
            { value: 'expenses', label: 'Expenses' },
            { value: 'analytics', label: 'Analytics' },
          ]}
        />

        <div className="ml-auto flex items-center gap-1">
          <IconButton label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun /> : <Moon />}
          </IconButton>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account"
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-[13px] font-semibold text-fg-2 transition-colors hover:bg-line-strong hover:text-fg"
            >
              {initial}
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-10 w-64 overflow-hidden rounded-md border border-line bg-surface p-1 shadow-[var(--shadow-pop)]"
              >
                <div className="px-3 py-2.5">
                  <p className="text-xs text-fg-3">Signed in as</p>
                  <p className="truncate text-sm font-medium text-fg">{email}</p>
                </div>
                <div className="my-1 h-px bg-line" />
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onBackup();
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-fg-2 hover:bg-surface-2 hover:text-fg"
                >
                  <DatabaseBackup className="h-4 w-4" /> Download backup
                </button>
                <button
                  role="menuitem"
                  type="button"
                  onClick={onSignOut}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-fg-2 hover:bg-surface-2 hover:text-fg"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
