'use client';

import { useState, useEffect } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import NumericInput from '@/components/ui/NumericInput';
import { getKuota, createKuota, updateKuota, deleteKuota, getSuppliers, getOperators } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatRupiah, formatDate } from '@/lib/utils';
import type { MsKuota, MsSupplier, MsOperator } from '@/lib/types';
import BarcodeScannerModal from '@/components/ui/BarcodeScannerModal';

const emptyForm = { supplier: '', barcode: '', operator: '', description: '', qty: '', harga_modal: '', harga_jual: '' };

export default function KuotaPage() {
  const user = getCurrentUser();
  const [data, setData] = useState<MsKuota[]>([]);
  const [suppliers, setSuppliers] = useState<MsSupplier[]>([]);
  const [operators, setOperators] = useState<MsOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MsKuota | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [scannerOpen, setScannerOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [d, s, o] = await Promise.all([getKuota(), getSuppliers(), getOperators()]);
      setData(d); setSuppliers(s); setOperators(o);
    } catch { /* no-op */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (row: MsKuota) => {
    setEditing(row);
    setForm({ supplier: row.supplier, barcode: row.barcode, operator: row.operator, description: row.description, qty: String(row.qty), harga_modal: String(row.harga_modal), harga_jual: String(row.harga_jual) });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditing(null); setError(''); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    const payload = { supplier: form.supplier, barcode: form.barcode, operator: form.operator, description: form.description, qty: parseInt(form.qty), harga_modal: parseInt(form.harga_modal), harga_jual: parseInt(form.harga_jual) };
    try {
      if (editing) await updateKuota(editing.id, { ...payload, update_by: user?.username });
      else await createKuota({ ...payload, create_by: user?.username });
      await load(); closeModal();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus kuota ini?')) return;
    try { await deleteKuota(id); setData(d => d.filter(r => r.id !== id)); }
    catch { alert('Gagal menghapus'); }
  };

  const columns = [
    {
      key: 'description', label: 'Produk Kuota',
      render: (row: MsKuota) => (
        <span>
          <strong>{row.description}</strong><br />
          <small style={{ color: '#888' }}>{row.operator}</small>
        </span>
      ),
    },
    { key: 'barcode', label: 'Barcode', render: (row: MsKuota) => <code style={{ fontSize: 11 }}>{row.barcode}</code> },
    { key: 'supplier', label: 'Supplier' },
    { key: 'qty', label: 'Qty', render: (row: MsKuota) => <span className={`badge ${row.qty > 0 ? 'badge-success' : 'badge-error'}`}>{row.qty}</span> },
    { key: 'harga_modal', label: 'Modal', render: (row: MsKuota) => formatRupiah(row.harga_modal) },
    { key: 'harga_jual', label: 'Jual', render: (row: MsKuota) => formatRupiah(row.harga_jual) },
    {
      key: 'actions', label: 'Aksi', width: '120px',
      render: (row: MsKuota) => (
        <div className="table-actions">
          <button className="btn btn-outline btn-sm" onClick={() => openEdit(row)} id={`btn-edit-kuo-${row.id}`}>✏️</button>
          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)} id={`btn-del-kuo-${row.id}`}>🗑️</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Kuota</h1>
          <p className="page-subtitle">Kelola stok paket data & kuota internet</p>
        </div>
      </div>
      <DataTable columns={columns} data={data} loading={loading} onAdd={openAdd} addLabel="+ Tambah Kuota" />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit Kuota' : 'Tambah Kuota'} size="lg"
        footer={<>
          <button className="btn btn-secondary" onClick={closeModal}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} id="btn-save-kuo">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </>}
      >
        {error && <div className="alert alert-error mb-16">{error}</div>}
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Supplier *</label>
              <select className="form-control" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} required id="kuo-supplier">
                <option value="">-- Pilih Supplier --</option>
                {suppliers.map(s => <option key={s.id} value={s.nama}>{s.nama}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Operator *</label>
              <select className="form-control" value={form.operator} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))} required id="kuo-operator">
                <option value="">-- Pilih Operator --</option>
                {operators.map(o => <option key={o.id} value={o.nama}>{o.nama}</option>)}
              </select>
            </div>
            <div className="form-group col-span-2">
              <label className="form-label">Deskripsi Paket *</label>
              <input type="text" className="form-control" placeholder="Contoh: Paket 10GB 30 Hari" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required id="kuo-desc" />
            </div>
            <div className="form-group">
              <label className="form-label">Barcode *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" className="form-control barcode-input" style={{ flex: 1 }} placeholder="Barcode produk" value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} required id="kuo-barcode" />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setScannerOpen(true)}
                  title="Scan menggunakan kamera"
                  id="btn-scan-camera-kuo"
                  style={{ padding: '0 12px' }}
                >
                  📷
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Qty *</label>
              <input type="number" className="form-control" placeholder="0" min="0" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} required id="kuo-qty" />
            </div>
            <div className="form-group">
              <label className="form-label">Harga Modal *</label>
              <NumericInput className="form-control" placeholder="0" value={form.harga_modal} onChange={(val, rawStr) => setForm(f => ({ ...f, harga_modal: rawStr }))} required id="kuo-modal" />
            </div>
            <div className="form-group">
              <label className="form-label">Harga Jual *</label>
              <NumericInput className="form-control" placeholder="0" value={form.harga_jual} onChange={(val, rawStr) => setForm(f => ({ ...f, harga_jual: rawStr }))} required id="kuo-jual" />
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
