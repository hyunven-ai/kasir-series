'use client';

import { useState, useEffect } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { getMerks, createMerk, updateMerk, deleteMerk } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import type { MsMerk } from '@/lib/types';

const KATEGORI_OPTIONS = ['HP', 'HP Non Pajak', 'Aksesoris', 'CCTV', 'Kuota'];

export default function MerkPage() {
  const user = getCurrentUser();
  const [data, setData] = useState<MsMerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MsMerk | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ nama: '', kategori: 'HP' });

  const load = async () => {
    setLoading(true);
    try {
      const d = await getMerks();
      setData(d);
    } catch {
      setError('Gagal memuat data merk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ nama: '', kategori: 'HP' });
    setModalOpen(true);
  };

  const openEdit = (row: MsMerk) => {
    setEditing(row);
    setForm({ nama: row.nama, kategori: row.kategori });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await updateMerk(editing.id, { ...form, update_by: user?.username });
      } else {
        await createMerk({ ...form, create_by: user?.username });
      }
      await load();
      closeModal();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin hapus data merk ini?')) return;
    setDeleting(id);
    try {
      await deleteMerk(id);
      setData(prev => prev.filter(d => d.id !== id));
    } catch {
      alert('Gagal menghapus data');
    } finally {
      setDeleting(null);
    }
  };

  const columns = [
    {
      key: 'nama',
      label: 'Nama Merk',
      render: (row: MsMerk) => <span style={{ fontWeight: 500 }}>{row.nama}</span>,
    },
    {
      key: 'kategori',
      label: 'Kategori',
      render: (row: MsMerk) => (
        <span className={`badge ${
          row.kategori === 'HP' ? 'badge-info' :
          row.kategori === 'HP Non Pajak' ? 'badge-purple' :
          row.kategori === 'Aksesoris' ? 'badge-success' :
          row.kategori === 'CCTV' ? 'badge-warning' : 'badge-gray'
        }`}>
          {row.kategori}
        </span>
      ),
    },
    {
      key: 'create_time',
      label: 'Dibuat',
      render: (row: MsMerk) => formatDate(row.create_time),
    },
    {
      key: 'create_by',
      label: 'Dibuat Oleh',
      render: (row: MsMerk) => row.create_by ?? '-',
    },
    {
      key: 'actions',
      label: 'Aksi',
      width: '120px',
      render: (row: MsMerk) => (
        <div className="table-actions">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => openEdit(row)}
            title="Edit"
            id={`btn-edit-${row.id}`}
          >
            ✏️
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => handleDelete(row.id)}
            title="Hapus"
            disabled={deleting === row.id}
            id={`btn-del-${row.id}`}
          >
            {deleting === row.id ? <div className="spinner" style={{ width: 12, height: 12 }} /> : '🗑️'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Master Merk</h1>
          <p className="page-subtitle">Kelola data merk produk berdasarkan kategori</p>
        </div>
      </div>

      <DataTable
        columns={columns as Parameters<typeof DataTable>[0]['columns']}
        data={data as Record<string, unknown>[]}
        loading={loading}
        onAdd={openAdd}
        addLabel="+ Tambah Merk"
      />

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Merk' : 'Tambah Merk'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>Batal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving} id="btn-save-merk">
              {saving ? <div className="spinner" style={{ width: 14, height: 14 }} /> : null}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </>
        }
      >
        {error && <div className="alert alert-error mb-16">{error}</div>}
        <form onSubmit={handleSave}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="form-group">
              <label className="form-label">Nama Merk *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: Samsung, Apple, Xiaomi..."
                value={form.nama}
                onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                autoFocus
                required
                id="input-nama-merk"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Kategori *</label>
              <select
                className="form-control"
                value={form.kategori}
                onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}
                id="input-kategori-merk"
              >
                {KATEGORI_OPTIONS.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
