'use client';

import { useState, useEffect } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { getPembelian, createPembelian, getSuppliers, getAksesoris, getKuota } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatRupiah, formatDateTime, generateInvoiceNo, today } from '@/lib/utils';
import type { TrsPembelianHdr, TrsPembelianDtl, MsSupplier, MsAksesoris, MsKuota } from '@/lib/types';

interface CartPembelian {
  idbarang: number;
  kategori: string;
  code: string;
  nama_barang: string;
  qty: number;
  harga_modal: number;
  harga_jual: number;
}

export default function PembelianPage() {
  const user = getCurrentUser();
  const [data, setData] = useState<TrsPembelianHdr[]>([]);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<MsSupplier[]>([]);
  const [aksesoris, setAksesoris] = useState<MsAksesoris[]>([]);
  const [kuota, setKuota] = useState<MsKuota[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [dtlModal, setDtlModal] = useState(false);
  const [selectedHdr, setSelectedHdr] = useState<TrsPembelianHdr | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ supplier: '', tanggal_pembelian: today() });
  const [items, setItems] = useState<CartPembelian[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [d, s, a, k] = await Promise.all([getPembelian(), getSuppliers(), getAksesoris(), getKuota()]);
      setData(d); setSuppliers(s); setAksesoris(a); setKuota(k);
    } catch { /* no-op */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addItem = () => {
    setItems(prev => [...prev, { idbarang: 0, kategori: 'Aksesoris', code: '', nama_barang: '', qty: 1, harga_modal: 0, harga_jual: 0 }]);
  };

  const removeItem = (i: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateItem = (i: number, field: string, value: string | number) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { alert('Tambahkan minimal 1 item'); return; }
    setSaving(true);
    try {
      await createPembelian(
        {
          no_invoice: generateInvoiceNo().replace('INV', 'PO'),
          supplier: form.supplier,
          tanggal_pembelian: form.tanggal_pembelian + 'T00:00:00',
          status: 1,
          create_by: user?.username ?? '',
        },
        items.map(item => ({
          idbarang: item.idbarang,
          kategori: item.kategori as 'HP' | 'HP Non Pajak' | 'Aksesoris' | 'CCTV' | 'Kuota',
          code: item.code,
          nama_barang: item.nama_barang,
          qty: item.qty,
          harga_modal: item.harga_modal,
          harga_jual: item.harga_jual,
          create_by: user?.username ?? '',
        }))
      );
      await load(); setModalOpen(false); setItems([]);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  const totalPembelian = data.reduce((sum, d) => {
    const dtls = (d as unknown as { trs_pembelian_dtl?: TrsPembelianDtl[] }).trs_pembelian_dtl ?? [];
    return sum + dtls.reduce((s, item) => s + item.harga_modal * item.qty, 0);
  }, 0);

  const columns = [
    { key: 'no_invoice', label: 'No. PO', render: (row: TrsPembelianHdr) => <code style={{ fontSize: 11 }}>{row.no_invoice ?? '-'}</code> },
    { key: 'supplier', label: 'Supplier', render: (row: TrsPembelianHdr) => <strong>{row.supplier}</strong> },
    { key: 'tanggal_pembelian', label: 'Tanggal', render: (row: TrsPembelianHdr) => formatDateTime(row.tanggal_pembelian) },
    {
      key: 'total', label: 'Total',
      render: (row: TrsPembelianHdr) => {
        const dtls = (row as unknown as { trs_pembelian_dtl?: TrsPembelianDtl[] }).trs_pembelian_dtl ?? [];
        const tot = dtls.reduce((s, d) => s + d.harga_modal * d.qty, 0);
        return <span style={{ fontWeight: 600, color: '#e53935' }}>{formatRupiah(tot)}</span>;
      },
    },
    {
      key: 'status', label: 'Status',
      render: (row: TrsPembelianHdr) => (
        <span className={`badge ${row.status === 1 ? 'badge-success' : 'badge-warning'}`}>
          {row.status === 1 ? 'Selesai' : 'Draft'}
        </span>
      ),
    },
    {
      key: 'actions', label: 'Aksi', width: '100px',
      render: (row: TrsPembelianHdr) => (
        <button className="btn btn-outline btn-sm" onClick={() => { setSelectedHdr(row); setDtlModal(true); }} id={`btn-dtl-po-${row.id}`}>
          Detail
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pembelian</h1>
          <p className="page-subtitle">Catat nota pembelian dari supplier — stok otomatis bertambah</p>
        </div>
      </div>

      {/* Summary */}
      <div className="metric-cards-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 20 }}>
        <div className="metric-card metric-card-blue">
          <div className="metric-card-label">Total Transaksi</div>
          <div className="metric-card-value" style={{ fontSize: 24 }}>{data.length}</div>
        </div>
        <div className="metric-card metric-card-red">
          <div className="metric-card-label">Total Pengeluaran</div>
          <div className="metric-card-value">{formatRupiah(totalPembelian)}</div>
        </div>
        <div className="metric-card metric-card-teal">
          <div className="metric-card-label">Supplier Aktif</div>
          <div className="metric-card-value" style={{ fontSize: 24 }}>{suppliers.length}</div>
        </div>
      </div>

      <DataTable columns={columns as Parameters<typeof DataTable>[0]['columns']} data={data as Record<string, unknown>[]} loading={loading} onAdd={() => { setForm({ supplier: suppliers[0]?.nama ?? '', tanggal_pembelian: today() }); setItems([]); setModalOpen(true); }} addLabel="+ Nota Pembelian" />

      {/* Create PO Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Nota Pembelian" size="xl"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} id="btn-save-po">
            {saving ? 'Menyimpan...' : '💾 Simpan & Tambah Stok'}
          </button>
        </>}
      >
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div className="form-group">
            <label className="form-label">Supplier *</label>
            <select className="form-control" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} id="po-supplier">
              <option value="">-- Pilih Supplier --</option>
              {suppliers.map(s => <option key={s.id} value={s.nama}>{s.nama}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tanggal Pembelian</label>
            <input type="date" className="form-control" value={form.tanggal_pembelian} onChange={e => setForm(f => ({ ...f, tanggal_pembelian: e.target.value }))} id="po-tanggal" />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Item Pembelian</div>
          <button className="btn btn-success btn-sm" onClick={addItem} id="btn-add-po-item">+ Tambah Item</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Nama Barang</th>
                <th>Kode/Barcode</th>
                <th>Qty</th>
                <th>Harga Modal</th>
                <th>Harga Jual</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#aaa' }}>
                  Klik "+ Tambah Item" untuk menambah barang
                </td></tr>
              )}
              {items.map((item, i) => (
                <tr key={i}>
                  <td>
                    <select className="form-control" value={item.kategori} onChange={e => updateItem(i, 'kategori', e.target.value)} id={`po-item-kat-${i}`}>
                      <option>HP</option><option>HP Non Pajak</option>
                      <option>Aksesoris</option><option>CCTV</option><option>Kuota</option>
                    </select>
                  </td>
                  <td>
                    <input type="text" className="form-control" placeholder="Nama barang" value={item.nama_barang} onChange={e => updateItem(i, 'nama_barang', e.target.value)} id={`po-item-nama-${i}`} />
                  </td>
                  <td>
                    <input type="text" className="form-control" placeholder="Kode/IMEI/barcode" value={item.code} onChange={e => updateItem(i, 'code', e.target.value)} id={`po-item-code-${i}`} />
                  </td>
                  <td style={{ width: 70 }}>
                    <input type="number" className="form-control" min="1" value={item.qty} onChange={e => updateItem(i, 'qty', parseInt(e.target.value))} id={`po-item-qty-${i}`} />
                  </td>
                  <td>
                    <input type="number" className="form-control" min="0" value={item.harga_modal} onChange={e => updateItem(i, 'harga_modal', parseInt(e.target.value))} id={`po-item-modal-${i}`} />
                  </td>
                  <td>
                    <input type="number" className="form-control" min="0" value={item.harga_jual} onChange={e => updateItem(i, 'harga_jual', parseInt(e.target.value))} id={`po-item-jual-${i}`} />
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeItem(i)} id={`btn-del-po-item-${i}`}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={dtlModal} onClose={() => setDtlModal(false)} title={`Detail PO — ${selectedHdr?.no_invoice}`} size="lg"
        footer={<button className="btn btn-secondary" onClick={() => setDtlModal(false)}>Tutup</button>}
      >
        {selectedHdr && (
          <>
            <div className="form-grid" style={{ marginBottom: 16 }}>
              <div><div style={{ fontSize: 12, color: '#888' }}>Supplier</div><strong>{selectedHdr.supplier}</strong></div>
              <div><div style={{ fontSize: 12, color: '#888' }}>Tanggal</div><strong>{formatDateTime(selectedHdr.tanggal_pembelian)}</strong></div>
            </div>
            <table className="data-table">
              <thead><tr><th>#</th><th>Barang</th><th>Kode</th><th>Qty</th><th>Modal</th><th>Jual</th></tr></thead>
              <tbody>
                {((selectedHdr as unknown as { trs_pembelian_dtl?: TrsPembelianDtl[] }).trs_pembelian_dtl ?? []).map((d, i) => (
                  <tr key={d.id}>
                    <td>{i + 1}</td>
                    <td>{d.nama_barang}</td>
                    <td><code style={{ fontSize: 11 }}>{d.code}</code></td>
                    <td>{d.qty}</td>
                    <td>{formatRupiah(d.harga_modal)}</td>
                    <td>{formatRupiah(d.harga_jual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Modal>
    </div>
  );
}
