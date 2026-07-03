'use client';

import { AuthUser } from '@/lib/types';
import { getRoleLabel } from '@/lib/auth';

interface HeaderProps {
  user: AuthUser;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onToggleSidebar: () => void;
  onLogout: () => void;
}

export default function Header({ user, isDarkMode, onToggleDarkMode, onToggleSidebar, onLogout }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-left">
        <button className="header-toggle" onClick={onToggleSidebar} title="Toggle Sidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="header-title">Series Ponsel</span>
      </div>

      <div className="header-right">
        <div className="header-user-btn">
          <div className="header-avatar">
            {user.nama_lengkap.charAt(0).toUpperCase()}
          </div>
          <span>{user.nama_lengkap}</span>
          <span style={{ fontSize: 11, opacity: 0.75 }}>({getRoleLabel(user.role)})</span>
        </div>

        <button className="header-theme-btn" onClick={onToggleDarkMode} title={isDarkMode ? "Light Mode" : "Dark Mode"}>
          {isDarkMode ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        <button className="header-logout-btn" onClick={onLogout} title="Logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
