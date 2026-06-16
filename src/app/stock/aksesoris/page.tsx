'use client';

import { useState, useEffect } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { getAksesoris, createAksesoris, updateAksesoris, deleteAksesoris, getSuppliers, getMerks } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatRupiah, formatDate } from '@/lib/utils';
import type { MsAksesoris, MsSupplier, MsMerk } from '@/lib/types';

const emptyForm = { supplier: '', barcode: '', merk: '', nama: '', qty: '', harga_modal: '', harga_jual: '' };

export default function AksesorisPage() {
  const user = getCurrentUser();
  const [data, setData] = useState<MsAksesoris[]>([]);
  const [suppliers, setSuppliers] = useState<MsSupplier[]>([]);
  const [merks, setMerks] = useState<MsMerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MsAksesoris | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const [d, s, m] = await Promise.all([getAksesoris(), getSuppliers(), getMerks()]);
      setData(d); setSuppliers(s);
      setMerks(m.filter(mk => mk.kategori === 'Aksesoris'));
    } catch { /* no-op */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (row: MsAksesoris) => {
    setEditing(row);
    setForm({ supplier: row.supplier, barcode: row.barcode, merk: row.merk, nama: row.nama, qty: String(row.qty), harga_modal: String(row.harga_modal), harga_jual: String(row.harga_jual) });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditing(null); setError(''); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    const payload = { supplier: form.supplier, barcode: form.barcode, merk: form.merk, nama: form.nama, qty: parseInt(form.qty), harga_modal: parseInt(form.harga_modal), harga_jual: parseInt(form.harga_jual) };
    try {
      if (editing) await updateAksesoris(editing.id, { ...payload, update_by: user?.username });
      else await createAksesoris({ ...payload, create_by: user?.username });
      await load(); closeModal();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus aksesoris ini?')) return;
    try { await deleteAksesoris(id); setData(d => d.filter(r => r.id !== id)); }
    catch { alert('Gagal menghapus'); }
  };

  const columns = [
    { key: 'nama', label: 'Nama', render: (row: MsAksesoris) => <span><strong>{row.nama}</strong><br /><small style={{ color: '#888' }}>{row.merk}</small></span> },
    { key: 'barcode', label: 'Barcode', render: (row: MsAksesoris) => <code style={{ fontSize: 11 }}>{row.barcode}</code> },
    { key: 'supplier', label: 'Supplier' },
    { key: 'qty', label: 'Qty', render: (row: MsAksesoris) => <span className={`badge ${row.qty > 0 ? 'badge-success' : 'badge-error'}`}>{row.qty}</span> },
    { key: 'harga_modal', label: 'Modal', render: (row: MsAksesoris) => formatRupiah(row.harga_modal) },
    { key: 'harga_jual', label: 'Jual', render: (row: MsAksesoris) => formatRupiah(row.harga_jual) },
    {
      key: 'actions', label: 'Aksi', width: '120px',
      render: (row: MsAksesoris) => (
        <div className="table-actions">
          <button className="btn btn-outline btn-sm" onClick={() => openEdit(row)} id={`btn-edit-aks-${row.id}`}>✏️</button>
          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)} id={`btn-del-aks-${row.id}`}>🗑️</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Aksesoris</h1>
          <p className="page-subtitle">Kelola stok aksesoris dengan barcode dan kuantitas</p>
        </div>
      </div>
      <DataTable columns={columns} data={data} loading={loading} onAdd={openAdd} addLabel="+ Tambah Aksesoris" />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit Aksesoris' : 'Tambah Aksesoris'} size="lg"
        footer={<>
          <button className="btn btn-secondary" onClick={closeModal}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} id="btn-save-aks">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </>}
      >
        {error && <div className="alert alert-error mb-16">{error}</div>}
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Supplier *</label>
              <select className="form-control" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} required id="aks-supplier">
                <option value="">-- Pilih Supplier --</option>
                {suppliers.map(s => <option key={s.id} value={s.nama}>{s.nama}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Merk *</label>
              <select className="form-control" value={form.merk} onChange={e => setForm(f => ({ ...f, merk: e.target.value }))} required id="aks-merk">
                <option value="">-- Pilih Merk --</option>
                {merks.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
              </select>
            </div>
            <div className="form-group col-span-2">
              <label className="form-label">Nama Aksesoris *</label>
              <input type="text" className="form-control" placeholder="Nama produk aksesoris" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} required id="aks-nama" />
            </div>
            <div className="form-group">
              <label className="form-label">Barcode *</label>
              <input type="text" className="form-control barcode-input" placeholder="Scan atau ketik barcode" value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} required id="aks-barcode" />
            </div>
            <div className="form-group">
              <label className="form-label">Qty *</label>
              <input type="number" className="form-control" placeholder="0" min="0" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} required id="aks-qty" />
            </div>
            <div className="form-group">
              <label className="form-label">Harga Modal *</label>
              <input type="number" className="form-control" placeholder="0" min="0" value={form.harga_modal} onChange={e => setForm(f => ({ ...f, harga_modal: e.target.value }))} required id="aks-modal" />
            </div>
            <div className="form-group">
              <label className="form-label">Harga Jual *</label>
              <input type="number" className="form-control" placeholder="0" min="0" value={form.harga_jual} onChange={e => setForm(f => ({ ...f, harga_jual: e.target.value }))} required id="aks-jual" />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
