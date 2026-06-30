'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatRupiah, formatDateTime } from '@/lib/utils';

interface PrintReceiptProps {
  invoiceNo: string;
  customer: string;
  tanggalPenjualan: string;
  metodePembayaran?: string;
  items: Array<{
    nama_barang: string;
    qty: number;
    harga_jual: number;
    kategori?: string;
    code?: string;
  }>;
  total: number;
  bayar?: number;
  invoiceIndex?: number; // Optional sequential invoice number, e.g., #19
}

export default function PrintReceipt({
  invoiceNo,
  customer,
  tanggalPenjualan,
  metodePembayaran = 'Tunai',
  items,
  total,
  bayar,
  invoiceIndex,
}: PrintReceiptProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Calculate unique product count and total quantity
  const productCount = items.length;
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

  // Extract sequential invoice number from INV/YYMMDD/XXXX pattern if no index is given
  const displayIndex = invoiceIndex !== undefined 
    ? `#${invoiceIndex}` 
    : invoiceNo ? `#${invoiceNo.split('/').pop()?.replace(/^0+/, '') || invoiceNo}` : '';

  const cleanBayar = bayar !== undefined ? bayar : total;
  const kembalian = cleanBayar - total;

  if (!mounted) return null;

  return createPortal(
    <div className="print-receipt-container">
      {/* Logo */}
      <div className="receipt-header">
        <img src="/logo-series.webp" alt="Logo Series" style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '6px' }} />
        
        <h1 className="receipt-shop-name">SERIES PONSEL</h1>
        <p className="receipt-shop-address">Jalan Pasar Beringin no.05</p>
        <p className="receipt-shop-address">SUNGAI PINYUH</p>
        
        {/* WhatsApp Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="#25D366" style={{ flexShrink: 0 }}>
            <path d="M12.012 2c-5.506 0-9.988 4.482-9.988 9.988 0 1.76.458 3.475 1.332 5l-1.354 4.954 5.074-1.33c1.472.802 3.12 1.226 4.792 1.226 5.506 0 10.026-4.52 10.026-9.988C22.038 6.482 17.518 2 12.012 2zm6.068 14.248c-.248.694-1.232 1.272-1.72 1.326-.46.052-.962.074-1.6.148-1.072.38-2.61-.318-3.92-1.628-1.31-1.31-2.008-2.848-1.628-3.92.074-.638.096-1.14.148-1.6.054-.488.632-1.472 1.326-1.72.176-.062.336-.046.46.046.126.096.966 2.33.996 2.45.03.12.03.226-.046.336-.076.11-.152.226-.228.336-.076.11-.16.226-.068.38.318.528.874 1.118 1.488 1.732.614.614 1.204 1.17 1.732 1.488.152.092.27.008.38-.068.11-.076.226-.152.336-.228.11-.076.216-.076.336-.046.12.03 2.354.87 2.45.996.092.124.076.284.046.46z"/>
          </svg>
          <span style={{ fontWeight: 700, fontSize: 11.5 }}>0812-5866-6628</span>
        </div>

        {/* Social Media Grid */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8, width: '100%' }}>
          {/* Facebook */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.1, fontSize: 8, fontWeight: 700 }}>
              <span>MArr LinDa</span>
              <span>Vierry Kien'z</span>
            </div>
          </div>

          {/* Instagram */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="#E4405F">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051C.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: 8 }}>Series_ponsel</span>
          </div>

          {/* TikTok */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="#000000">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.52-4.06-1.41-.45-.34-.84-.74-1.19-1.19v7.54c.04 3.44-1.89 6.81-5.18 7.91-3.28 1.14-7.23-.33-8.81-3.37-1.58-3.05-.72-7.27 2-9.25 1.99-1.48 4.79-1.78 7.03-.76v4.35c-1.42-.87-3.37-.62-4.52.54-1.15 1.15-1.19 3.16-.1 4.41.98 1.18 2.8 1.51 4.15.77 1.04-.54 1.63-1.63 1.6-2.82V0l.03.02z"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: 8 }}>SERIES PONSEL</span>
          </div>
        </div>
      </div>

      <div className="receipt-meta">
        <span>{formatDateTime(tanggalPenjualan)}</span>
        <span>{displayIndex}</span>
      </div>
      <div className="receipt-meta" style={{ marginTop: 2, fontSize: '10.5px' }}>
        <span>Pembeli: {customer || 'Umum'}</span>
      </div>

      <div className="receipt-divider"></div>

      <div className="receipt-items">
        {items.map((item, index) => (
          <div key={index} className="receipt-item-row">
            <div className="receipt-item-title">
              {index + 1}. {item.nama_barang}
            </div>
            {(item.kategori === 'HP' || item.kategori === 'HP Non Pajak') && item.code && (
              <div style={{ fontSize: '11.5px', color: '#000', fontWeight: 'bold', paddingLeft: '12px', marginTop: '-1px', marginBottom: '1px' }}>
                IMEI: {item.code}
              </div>
            )}
            <div className="receipt-item-details">
              <span>{item.qty}x {item.harga_jual.toLocaleString('id-ID')}</span>
              <span>{(item.qty * item.harga_jual).toLocaleString('id-ID')}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="receipt-divider"></div>

      <div className="receipt-summary">
        <div className="receipt-summary-row">
          <span>Produk: {productCount}</span>
        </div>
        <div className="receipt-summary-row">
          <span>Item: {totalQty}</span>
        </div>
      </div>

      <div className="receipt-divider"></div>

      <div className="receipt-totals">
        <div className="receipt-total-row bold">
          <span>Total</span>
          <span>{formatRupiah(total)}</span>
        </div>
        <div className="receipt-total-row">
          <span>{metodePembayaran}</span>
          <span>{formatRupiah(cleanBayar)}</span>
        </div>
        {metodePembayaran === 'Tunai' && kembalian > 0 && (
          <div className="receipt-total-row">
            <span>Kembalian</span>
            <span>{formatRupiah(kembalian)}</span>
          </div>
        )}
      </div>

      <div style={{ border: '1px solid #000000', padding: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '9.5px', marginTop: '12px', boxSizing: 'border-box' }}>
        Barang yang sudah di beli tidak bisa di kembalikan!!!
      </div>

      <div className="receipt-footer" style={{ textDecoration: 'underline', fontStyle: 'italic', marginTop: '10px' }}>
        TERIMA KASIH BOSKUUU!!!
      </div>
    </div>,
    document.body
  );
}
