'use client';

import { useState, useEffect } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { getOperators, createOperator, updateOperator, deleteOperator } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import type { MsOperator } from '@/lib/types';

export default function OperatorPage() {
  const user = getCurrentUser();
  const [data, setData] = useState<MsOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MsOperator | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ nama: '' });

  const load = async () => {
    setLoading(true);
    try { setData(await getOperators()); }
    catch { setError('Gagal memuat data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ nama: '' }); setModalOpen(true); };
  const openEdit = (row: MsOperator) => { setEditing(row); setForm({ nama: row.nama }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); setError(''); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) return;
    setSaving(true); setError('');
    try {
      if (editing) await updateOperator(editing.id, { ...form, update_by: user?.username });
      else await createOperator({ ...form, create_by: user?.username });
      await load(); closeModal();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus operator ini?')) return;
    try { await deleteOperator(id); setData(d => d.filter(r => r.id !== id)); }
    catch { alert('Gagal menghapus'); }
  };

  const columns = [
    {
      key: 'nama', label: 'Nama Operator',
      render: (row: MsOperator) => <span style={{ fontWeight: 500 }}>{row.nama}</span>,
    },
    { key: 'create_time', label: 'Dibuat', render: (row: MsOperator) => formatDate(row.create_time) },
    { key: 'create_by', label: 'Dibuat Oleh', render: (row: MsOperator) => row.create_by ?? '-' },
    {
      key: 'actions', label: 'Aksi', width: '120px',
      render: (row: MsOperator) => (
        <div className="table-actions">
          <button className="btn btn-outline btn-sm" onClick={() => openEdit(row)} id={`btn-edit-op-${row.id}`}>✏️</button>
          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)} id={`btn-del-op-${row.id}`}>🗑️</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Master Operator</h1>
          <p className="page-subtitle">Kelola data provider/operator seluler untuk produk kuota</p>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={data}
        loading={loading} onAdd={openAdd} addLabel="+ Tambah Operator"
      />
      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit Operator' : 'Tambah Operator'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>Batal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving} id="btn-save-op">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </>
        }
      >
        {error && <div className="alert alert-error mb-16">{error}</div>}
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Nama Operator *</label>
            <input
              type="text" className="form-control"
              placeholder="Contoh: Telkomsel, XL, Indosat, Tri..."
              value={form.nama} onChange={e => setForm({ nama: e.target.value })}
              autoFocus required id="input-nama-op"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
