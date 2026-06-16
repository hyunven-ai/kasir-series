'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { searchBarcode, createPenjualan } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatRupiah, generateInvoiceNo, today } from '@/lib/utils';
import type { CartItem, MetodePembayaran } from '@/lib/types';
import PrintReceipt from '@/components/ui/PrintReceipt';
import BarcodeScannerModal from '@/components/ui/BarcodeScannerModal';

const METODE_OPTIONS: MetodePembayaran[] = ['Tunai', 'Debit', 'Transfer', 'QRIS'];

export default function PenjualanPage() {
  const user = getCurrentUser();
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState('Umum');
  const [metode, setMetode] = useState<MetodePembayaran>('Tunai');
  const [bayar, setBayar] = useState('');
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [lastInvoice, setLastInvoice] = useState('');
  const [printData, setPrintData] = useState<{
    invoiceNo: string;
    customer: string;
    tanggalPenjualan: string;
    metodePembayaran: string;
    items: CartItem[];
    total: number;
    bayar?: number;
  } | null>(null);

  const [scannerOpen, setScannerOpen] = useState(false);

  const handleScanSuccess = async (scannedValue: string) => {
    if (!scannedValue.trim()) return;
    setSearching(true);
    setSearchError('');
    try {
      const result = await searchBarcode(scannedValue.trim());
      if (!result) {
        setSearchError(`Barang dengan kode "${scannedValue}" tidak ditemukan atau stok habis`);
        return;
      }
      // Check if already in cart
      const existing = cart.findIndex(c => c.code === result.code && c.kategori === result.kategori);
      if (existing >= 0) {
        if (cart[existing].qty >= (result.max_qty ?? 1)) {
          setSearchError(`Stok maksimal ${result.max_qty} unit`);
          return;
        }
        setCart(prev => prev.map((c, i) => i === existing ? { ...c, qty: c.qty + 1 } : c));
      } else {
        setCart(prev => [...prev, result]);
      }
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : 'Gagal mencari barang');
    } finally {
      setSearching(false);
    }
  };

  // Auto focus barcode input
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  const total = cart.reduce((sum, item) => sum + item.harga_jual * item.qty, 0);
  const totalModal = cart.reduce((sum, item) => sum + item.harga_modal * item.qty, 0);
  const kembalian = parseInt(bayar || '0') - total;

  const handleBarcodeSearch = useCallback(async () => {
    if (!barcode.trim()) return;
    setSearching(true);
    setSearchError('');
    try {
      const result = await searchBarcode(barcode.trim());
      if (!result) {
        setSearchError(`Barang dengan kode "${barcode}" tidak ditemukan atau stok habis`);
        setBarcode('');
        barcodeRef.current?.focus();
        return;
      }
      // Check if already in cart
      const existing = cart.findIndex(c => c.code === result.code && c.kategori === result.kategori);
      if (existing >= 0) {
        if (cart[existing].qty >= (result.max_qty ?? 1)) {
          setSearchError(`Stok maksimal ${result.max_qty} unit`);
          setBarcode('');
          return;
        }
        setCart(prev => prev.map((c, i) => i === existing ? { ...c, qty: c.qty + 1 } : c));
      } else {
        setCart(prev => [...prev, result]);
      }
      setBarcode('');
      barcodeRef.current?.focus();
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : 'Gagal mencari barang');
    } finally {
      setSearching(false);
    }
  }, [barcode, cart]);

  const updateQty = (idx: number, qty: number) => {
    const item = cart[idx];
    if (qty < 1) { removeItem(idx); return; }
    if (qty > (item.max_qty ?? 99)) return;
    setCart(prev => prev.map((c, i) => i === idx ? { ...c, qty } : c));
  };

  const removeItem = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const invoiceNo = generateInvoiceNo();
      await createPenjualan(
        {
          nomor_invoice: invoiceNo,
          customer,
          status: 1,
          tanggal_penjualan: new Date().toISOString(),
          metode_pembayaran: metode,
          total_harga: total,
          create_by: user?.username ?? 'kasir',
        },
        cart.map(item => ({
          idbarang: item.idbarang,
          kategori: item.kategori,
          code: item.code,
          nama_barang: item.nama_barang,
          qty: item.qty,
          harga_modal: item.harga_modal,
          harga_jual: item.harga_jual,
          supplier: item.supplier,
          create_by: user?.username ?? 'kasir',
        }))
      );
      setLastInvoice(invoiceNo);
      setPrintData({
        invoiceNo,
        customer,
        tanggalPenjualan: new Date().toISOString(),
        metodePembayaran: metode,
        items: [...cart],
        total,
        bayar: bayar ? parseInt(bayar) : total,
      });
      setCheckoutModal(false);
      setSuccessModal(true);
      setCart([]);
      setBayar('');
      setCustomer('Umum');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Gagal checkout');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Kasir — Penjualan</h1>
          <p className="page-subtitle">{today()} | {user?.nama_lengkap}</p>
        </div>
      </div>

      <div className="pos-layout">
        {/* Left: Barcode search + item list */}
        <div className="pos-products">
          {/* Barcode Input */}
          <div style={{ padding: 16, borderBottom: '1px solid #eee', background: '#fafafa' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="barcode-input-wrap" style={{ flex: 1 }}>
                <input
                  ref={barcodeRef}
                  type="text"
                  className="form-control form-control-lg barcode-input"
                  placeholder="Scan barcode / IMEI / SN atau ketik kode barang..."
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBarcodeSearch()}
                  id="pos-barcode-input"
                  autoFocus
                />
              </div>
              {/* Camera scan button */}
              <button
                className="btn btn-outline btn-lg"
                onClick={() => setScannerOpen(true)}
                title="Scan menggunakan kamera"
                id="btn-camera-scan"
                style={{ flexShrink: 0, fontSize: 18, padding: '0 14px' }}
              >
                📷
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleBarcodeSearch}
                disabled={searching || !barcode.trim()}
                id="btn-scan"
                style={{ flexShrink: 0 }}
              >
                {searching ? <div className="spinner" style={{ width: 16, height: 16 }} /> : '🔍 Cari'}
              </button>
            </div>
            {searchError && (
              <div className="alert alert-error mt-8" style={{ padding: '8px 12px', fontSize: 12 }}>
                ⚠️ {searchError}
              </div>
            )}
          </div>

          {/* Cart items in main area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
            {cart.length === 0 ? (
              <div className="empty-state" style={{ height: '100%' }}>
                <div className="empty-state-icon" style={{ fontSize: 60 }}>🛒</div>
                <div className="empty-state-text">Keranjang kosong</div>
                <div style={{ fontSize: 12, color: '#bbb', marginTop: 8 }}>
                  Scan barcode atau ketik kode barang untuk menambah item
                </div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 30 }}>#</th>
                    <th>Barang</th>
                    <th style={{ width: 60 }}>Kat.</th>
                    <th style={{ width: 120 }}>Harga Satuan</th>
                    <th style={{ width: 110 }}>Qty</th>
                    <th style={{ width: 130 }}>Subtotal</th>
                    <th style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => (
                    <tr key={`${item.code}-${idx}`}>
                      <td className="text-muted text-sm">{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{item.nama_barang}</div>
                        <code style={{ fontSize: 10, color: '#999' }}>{item.code}</code>
                      </td>
                      <td>
                        <span className={`badge badge-sm ${
                          item.kategori === 'HP' ? 'badge-info' :
                          item.kategori === 'HP Non Pajak' ? 'badge-purple' :
                          item.kategori === 'Aksesoris' ? 'badge-success' :
                          item.kategori === 'CCTV' ? 'badge-warning' : 'badge-gray'
                        }`} style={{ fontSize: 10 }}>
                          {item.kategori === 'HP Non Pajak' ? 'Non Pajak' : item.kategori}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{formatRupiah(item.harga_jual)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            className="btn btn-outline btn-sm btn-icon"
                            onClick={() => updateQty(idx, item.qty - 1)}
                            style={{ width: 28, height: 28, fontSize: 14 }}
                          >−</button>
                          <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>
                            {item.qty}
                          </span>
                          <button
                            className="btn btn-outline btn-sm btn-icon"
                            onClick={() => updateQty(idx, item.qty + 1)}
                            disabled={item.qty >= (item.max_qty ?? 99)}
                            style={{ width: 28, height: 28, fontSize: 14 }}
                          >+</button>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: '#1565c0' }}>
                        {formatRupiah(item.harga_jual * item.qty)}
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          onClick={() => removeItem(idx)}
                          style={{ width: 28, height: 28 }}
                          id={`btn-remove-${idx}`}
                        >✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Cart summary + checkout */}
        <div className="pos-cart">
          <div className="pos-cart-header">
            <div className="pos-cart-title">🧾 Ringkasan</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{cart.length} item</div>
          </div>

          <div className="pos-cart-items">
            {/* Customer */}
            <div className="form-group mb-12">
              <label className="form-label">Nama Pelanggan</label>
              <input
                type="text"
                className="form-control"
                value={customer}
                onChange={e => setCustomer(e.target.value)}
                placeholder="Nama pelanggan / Umum"
                id="pos-customer"
              />
            </div>

            {/* Metode Pembayaran */}
            <div className="form-group mb-12">
              <label className="form-label">Metode Pembayaran</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
                {METODE_OPTIONS.map(m => (
                  <button
                    key={m}
                    className={`btn ${metode === m ? 'btn-primary' : 'btn-outline'} btn-sm`}
                    onClick={() => setMetode(m)}
                    id={`btn-metode-${m.toLowerCase()}`}
                  >
                    {m === 'Tunai' ? '💵' : m === 'Debit' ? '💳' : m === 'Transfer' ? '🏦' : '📱'} {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Item summary */}
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              {cart.slice(0, 4).map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: idx < Math.min(cart.length, 4) - 1 ? '1px solid #eee' : 'none' }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                    {item.nama_barang} ×{item.qty}
                  </span>
                  <span style={{ fontWeight: 500 }}>{formatRupiah(item.harga_jual * item.qty)}</span>
                </div>
              ))}
              {cart.length > 4 && (
                <div style={{ fontSize: 11, color: '#999', textAlign: 'center', paddingTop: 6 }}>
                  +{cart.length - 4} item lainnya
                </div>
              )}
            </div>
          </div>

          <div className="pos-cart-footer">
            <div className="pos-total-row">
              <span className="text-muted">Subtotal</span>
              <span>{formatRupiah(total)}</span>
            </div>
            <div className="pos-total-row">
              <span className="text-muted">Modal</span>
              <span style={{ color: '#e53935' }}>{formatRupiah(totalModal)}</span>
            </div>
            <div className="pos-total-row grand-total">
              <span>TOTAL</span>
              <span>{formatRupiah(total)}</span>
            </div>

            {metode === 'Tunai' && (
              <>
                <div className="form-group mt-12">
                  <label className="form-label">Uang Dibayar</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0"
                    value={bayar}
                    onChange={e => setBayar(e.target.value)}
                    id="pos-bayar"
                  />
                </div>
                {bayar && (
                  <div className="pos-total-row mt-8" style={{ color: kembalian >= 0 ? '#2e7d32' : '#e53935', fontWeight: 600 }}>
                    <span>Kembalian</span>
                    <span>{formatRupiah(Math.max(0, kembalian))}</span>
                  </div>
                )}
              </>
            )}

            <button
              className="btn btn-success w-full mt-12"
              style={{ height: 46, fontSize: 15, fontWeight: 700 }}
              onClick={() => setCheckoutModal(true)}
              disabled={cart.length === 0}
              id="btn-checkout"
            >
              ✅ Proses Checkout ({cart.length} item)
            </button>

            {cart.length > 0 && (
              <button
                className="btn btn-outline w-full mt-8"
                style={{ color: '#e53935', borderColor: '#e53935' }}
                onClick={() => { if (confirm('Kosongkan keranjang?')) setCart([]); }}
                id="btn-clear-cart"
              >
                🗑️ Kosongkan Keranjang
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Confirmation Modal */}
      {checkoutModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 className="modal-title">Konfirmasi Checkout</h2>
              <button className="modal-close" onClick={() => setCheckoutModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Detail Transaksi</div>
                {cart.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0' }}>
                    <span>{item.nama_barang} ×{item.qty}</span>
                    <span style={{ fontWeight: 500 }}>{formatRupiah(item.harga_jual * item.qty)}</span>
                  </div>
                ))}
                <hr className="divider" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}>
                  <span>TOTAL</span>
                  <span style={{ color: '#1565c0' }}>{formatRupiah(total)}</span>
                </div>
              </div>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#888' }}>Pelanggan</div>
                  <div style={{ fontWeight: 600 }}>{customer}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#888' }}>Metode</div>
                  <div style={{ fontWeight: 600 }}>{metode}</div>
                </div>
                {metode === 'Tunai' && bayar && (
                  <>
                    <div>
                      <div style={{ fontSize: 12, color: '#888' }}>Bayar</div>
                      <div style={{ fontWeight: 600 }}>{formatRupiah(parseInt(bayar))}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#888' }}>Kembalian</div>
                      <div style={{ fontWeight: 600, color: '#2e7d32' }}>{formatRupiah(Math.max(0, kembalian))}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCheckoutModal(false)}>Batal</button>
              <button className="btn btn-success" onClick={handleCheckout} disabled={processing} id="btn-confirm-checkout">
                {processing ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Memproses...</> : '✅ Konfirmasi & Bayar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 380, textAlign: 'center' }}>
            <div className="modal-body" style={{ padding: 40 }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontFamily: 'Outfit', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Transaksi Berhasil!</h2>
              <p style={{ color: '#888', fontSize: 13 }}>No. Invoice: <strong>{lastInvoice}</strong></p>
              <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>Total: <strong style={{ color: '#1565c0' }}>{formatRupiah(printData?.total ?? 0)}</strong></p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline w-full" onClick={handlePrint} id="btn-print-receipt">🖨️ Cetak Struk</button>
                <button className="btn btn-primary w-full" onClick={() => { setSuccessModal(false); barcodeRef.current?.focus(); }} id="btn-close-success">
                  Transaksi Baru
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {printData && (
        <PrintReceipt
          invoiceNo={printData.invoiceNo}
          customer={printData.customer}
          tanggalPenjualan={printData.tanggalPenjualan}
          metodePembayaran={printData.metodePembayaran}
          items={printData.items}
          total={printData.total}
          bayar={printData.bayar}
        />
      )}

      {/* Camera Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}
