'use client';

import { useEffect, useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setShowConfirm(false); // Reset confirmation state when modal is closed
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleTryClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handler);
    }
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTryClose = () => {
    setShowConfirm(true);
  };

  const handleConfirmClose = () => {
    setShowConfirm(false);
    onClose();
  };

  const sizeClass = size === 'lg' ? 'modal modal-lg' : size === 'xl' ? 'modal modal-xl' : 'modal';

  return (
    <>
      <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) handleTryClose(); }}>
        <div className={sizeClass}>
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            <button className="modal-close" onClick={handleTryClose} id="modal-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      </div>

      {showConfirm && (
        <div className="modal-backdrop" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal" style={{ maxWidth: 400, width: '90%', padding: 24, textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>Persetujuan Tutup</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>Apakah Anda yakin ingin menutup? Semua data yang belum disimpan akan hilang.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowConfirm(false)}>Batal</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleConfirmClose}>Ya, Tutup</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
