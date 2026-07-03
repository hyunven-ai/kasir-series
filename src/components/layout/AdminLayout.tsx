'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { getCurrentUser, logout } from '@/lib/auth';
import { AuthUser } from '@/lib/types';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      router.replace('/login');
    } else {
      setUser(u);
    }
    setIsLoading(false);
  }, [router]);

  // Automatically close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleToggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return null; // sedang redirect ke /login
  }

  return (
    <div className="app-shell">
      <Sidebar user={user} collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      
      {/* Mobile Sidebar Backdrop Overlay */}
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      <main className={`app-main${collapsed ? ' sidebar-collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
        <Header
          user={user}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
          onToggleSidebar={() => {
            // If screen is mobile (checked via CSS media queries), toggle mobileOpen. Otherwise toggle collapsed.
            if (window.innerWidth <= 768) {
              setMobileOpen(prev => !prev);
            } else {
              setCollapsed(prev => !prev);
            }
          }}
          onLogout={handleLogout}
        />
        <div className="app-content">
          {children}
        </div>

        {/* Native Mobile App Style Bottom Navigation */}
        <nav className="mobile-bottom-nav">
          <Link href="/dashboard" className={`mobile-bottom-item${pathname === '/dashboard' ? ' active' : ''}`}>
            <span className="icon">🏠</span>
            <span className="label">Home</span>
          </Link>
          <Link href="/transaksi/penjualan" className={`mobile-bottom-item${pathname === '/transaksi/penjualan' ? ' active' : ''}`}>
            <span className="icon">🛒</span>
            <span className="label">Kasir</span>
          </Link>
          <Link href="/stock/hp" className={`mobile-bottom-item${pathname?.startsWith('/stock') ? ' active' : ''}`}>
            <span className="icon">📦</span>
            <span className="label">Stock</span>
          </Link>
          <button onClick={() => setMobileOpen(true)} className="mobile-bottom-item">
            <span className="icon">🍔</span>
            <span className="label">Menu</span>
          </button>
        </nav>
      </main>
    </div>
  );
}
