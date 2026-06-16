'use client';

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
  // Calculate unique product count and total quantity
  const productCount = items.length;
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

  // Extract sequential invoice number from INV/YYMMDD/XXXX pattern if no index is given
  const displayIndex = invoiceIndex !== undefined 
    ? `#${invoiceIndex}` 
    : invoiceNo ? `#${invoiceNo.split('/').pop()?.replace(/^0+/, '') || invoiceNo}` : '';

  const cleanBayar = bayar !== undefined ? bayar : total;
  const kembalian = cleanBayar - total;

  return (
    <div className="print-receipt-container">
      {/* Logo */}
      <div className="receipt-header">
        <img src="/logo-series.webp" alt="Logo Series" style={{ width: '48px', height: '48px', objectFit: 'contain', marginBottom: '8px' }} />
        
        <h1 className="receipt-shop-name">SERIES PONSEL</h1>
        <p className="receipt-shop-address">Jalan Pasar Beringin no.05</p>
        <p className="receipt-shop-address">SUNGAI PINYUH</p>
        <p className="receipt-shop-address">0812-5866-6628</p>
      </div>

      <div className="receipt-meta">
        <span>{formatDateTime(tanggalPenjualan)}</span>
        <span>{displayIndex}</span>
      </div>

      <div className="receipt-divider"></div>

      <div className="receipt-items">
        {items.map((item, index) => (
          <div key={index} className="receipt-item-row">
            <div className="receipt-item-title">
              {index + 1}. {item.nama_barang}
            </div>
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

      <div className="receipt-footer">
        TERIMA KASIH BOSKUUU!!!
      </div>
    </div>
  );
}
