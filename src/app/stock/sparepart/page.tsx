'use client';

import { useState, useEffect, useMemo } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import NumericInput from '@/components/ui/NumericInput';
import { getSparepart, createSparepart, updateSparepart, deleteSparepart, getSuppliers, getMerks } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatRupiah, formatDate } from '@/lib/utils';
import type { MsSparepart, MsSupplier, MsMerk } from '@/lib/types';
import BarcodeScannerModal from '@/components/ui/BarcodeScannerModal';

const emptyForm = { supplier: '', barcode: '', merk: '', nama: '', qty: '', harga_modal: '', harga_jual: '' };

export default function SparepartPage() {
  const user = getCurrentUser();
  const [data, setData] = useState<MsSparepart[]>([]);
  const [suppliers, setSuppliers] = useState<MsSupplier[]>([]);
  const [merks, setMerks] = useState<MsMerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MsSparepart | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Filter states
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterMerk, setFilterMerk] = useState('');
  const [filterBarcode, setFilterBarcode] = useState('');
  const [filterNama, setFilterNama] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [d, s, m] = await Promise.all([getSparepart(), getSuppliers(), getMerks()]);
      setData(d); setSuppliers(s);
      setMerks(m.filter(mk => mk.kategori === 'Sparepart'));
    } catch { /* no-op */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (row: MsSparepart) => {
    setEditing(row);
    setForm({ supplier: row.supplier, barcode: row.barcode, merk: row.merk, nama: row.nama, qty: String(row.qty), harga_modal: String(row.harga_modal), harga_jual: String(row.harga_jual) });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditing(null); setError(''); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    const finalBarcode = form.barcode.trim() || (editing?.barcode || `SPR-${Date.now()}`);
    const payload = { supplier: form.supplier, barcode: finalBarcode, merk: form.merk, nama: form.nama, qty: parseInt(form.qty), harga_modal: parseInt(form.harga_modal), harga_jual: parseInt(form.harga_jual) };
    try {
      if (editing) await updateSparepart(editing.id, { ...payload, update_by: user?.username });
      else await createSparepart({ ...payload, create_by: user?.username });
      await load(); closeModal();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus sparepart ini?')) return;
    try { await deleteSparepart(id); setData(d => d.filter(r => r.id !== id)); }
    catch { alert('Gagal menghapus'); }
  };

  // Filter logic
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSupplier = !filterSupplier || item.supplier === filterSupplier;
      const matchMerk = !filterMerk || item.merk === filterMerk;
      const matchBarcode = !filterBarcode || (item.barcode || '').toLowerCase().includes(filterBarcode.toLowerCase());
      const matchNama = !filterNama || item.nama.toLowerCase().includes(filterNama.toLowerCase());
      return matchSupplier && matchMerk && matchBarcode && matchNama;
    });
  }, [data, filterSupplier, filterMerk, filterBarcode, filterNama]);

  const columns = [
    { key: 'nama', label: 'Nama', render: (row: MsSparepart) => <span><strong>{row.nama}</strong><br /><small style={{ color: '#888' }}>{row.merk}</small></span> },
    { key: 'barcode', label: 'Barcode', render: (row: MsSparepart) => <code style={{ fontSize: 11 }}>{row.barcode}</code> },
    { key: 'supplier', label: 'Supplier' },
    { key: 'qty', label: 'Qty', render: (row: MsSparepart) => <span className={`badge ${row.qty > 0 ? 'badge-success' : 'badge-error'}`}>{row.qty}</span> },
    { key: 'harga_modal', label: 'Modal', render: (row: MsSparepart) => formatRupiah(row.harga_modal) },
    { key: 'harga_jual', label: 'Jual', render: (row: MsSparepart) => formatRupiah(row.harga_jual) },
    {
      key: 'actions', label: 'Aksi', width: '120px',
      render: (row: MsSparepart) => (
        <div className="table-actions">
          <button className="btn btn-outline btn-sm" onClick={() => openEdit(row)} id={`btn-edit-spr-${row.id}`}>✏️</button>
          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)} id={`btn-del-spr-${row.id}`}>🗑️</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Sparepart</h1>
          <p className="page-subtitle">Kelola stok sparepart dengan barcode dan kuantitas</p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="filter-bar">
        <div className="form-grid w-full" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nama Supplier</label>
            <select
              className="form-control"
              value={filterSupplier}
              onChange={e => setFilterSupplier(e.target.value)}
              id="filter-supplier"
            >
              <option value="">-- Semua Supplier --</option>
              {suppliers.map(s => <option key={s.id} value={s.nama}>{s.nama}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Merk</label>
            <select
              className="form-control"
              value={filterMerk}
              onChange={e => setFilterMerk(e.target.value)}
              id="filter-merk"
            >
              <option value="">-- Semua Merk --</option>
              {merks.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Barcode</label>
            <input
              type="text"
              className="form-control"
              placeholder="Cari barcode..."
              value={filterBarcode}
              onChange={e => setFilterBarcode(e.target.value)}
              id="filter-barcode"
            />
          </div>

          <div className="form-group col-span-2" style={{ marginBottom: 0 }}>
            <label className="form-label">Nama Sparepart</label>
            <input
              type="text"
              className="form-control"
              placeholder="Cari nama sparepart..."
              value={filterNama}
              onChange={e => setFilterNama(e.target.value)}
              id="filter-nama"
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              setFilterSupplier('');
              setFilterMerk('');
              setFilterBarcode('');
              setFilterNama('');
            }}
            id="btn-reset-filter"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🔄 Reset
          </button>
        </div>
      </div>

      <DataTable columns={columns} data={filteredData} loading={loading} onAdd={openAdd} addLabel="+ Tambah Sparepart" />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit Sparepart' : 'Tambah Sparepart'} size="lg"
        footer={<>
          <button className="btn btn-secondary" onClick={closeModal}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} id="btn-save-spr">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </>}
      >
        {error && <div className="alert alert-error mb-16">{error}</div>}
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Supplier *</label>
              <select className="form-control" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} required id="spr-supplier">
                <option value="">-- Pilih Supplier --</option>
                {suppliers.map(s => <option key={s.id} value={s.nama}>{s.nama}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Merk *</label>
              <select className="form-control" value={form.merk} onChange={e => setForm(f => ({ ...f, merk: e.target.value }))} required id="spr-merk">
                <option value="">-- Pilih Merk --</option>
                {merks.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
              </select>
            </div>
            <div className="form-group col-span-2">
              <label className="form-label">Nama Sparepart *</label>
              <input type="text" className="form-control" placeholder="Nama produk sparepart" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} required id="spr-nama" />
            </div>
            <div className="form-group">
              <label className="form-label">Barcode (Opsional)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" className="form-control barcode-input" style={{ flex: 1 }} placeholder="Scan/ketik barcode (kosongkan jika tidak ada)" value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} id="spr-barcode" />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setScannerOpen(true)}
                  title="Scan menggunakan kamera"
                  id="btn-scan-camera"
                  style={{ padding: '0 12px' }}
                >
                  📷
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Qty *</label>
              <input type="number" className="form-control" placeholder="0" min="0" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} required id="spr-qty" />
            </div>
            <div className="form-group">
              <label className="form-label">Harga Modal *</label>
              <NumericInput className="form-control" placeholder="0" value={form.harga_modal} onChange={(val, rawStr) => setForm(f => ({ ...f, harga_modal: rawStr }))} required id="spr-modal" />
            </div>
            <div className="form-group">
              <label className="form-label">Harga Jual *</label>
              <NumericInput className="form-control" placeholder="0" value={form.harga_jual} onChange={(val, rawStr) => setForm(f => ({ ...f, harga_jual: rawStr }))} required id="spr-jual" />
            </div>
          </div>
        </form>
      </Modal>
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={(code) => setForm(f => ({ ...f, barcode: code }))}
      />
    </div>
  );
}
