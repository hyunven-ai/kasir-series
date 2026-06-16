'use client';

import { useState, useEffect } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import {
  getHpNonPajakHdr, createHpNonPajakHdr, updateHpNonPajakHdr,
  getHpNonPajakDtl, createHpNonPajakDtl, deleteHpNonPajakDtl,
  getSuppliers, getMerks,
} from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { formatRupiah, formatDate } from '@/lib/utils';
import type { MsHpHdrNonPajak, MsHpDtlNonPajak, MsSupplier, MsMerk } from '@/lib/types';

export default function HpNonPajakPage() {
  const user = getCurrentUser();
  const [data, setData] = useState<MsHpHdrNonPajak[]>([]);
  const [suppliers, setSuppliers] = useState<MsSupplier[]>([]);
  const [merks, setMerks] = useState<MsMerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [hdrModal, setHdrModal] = useState(false);
  const [editingHdr, setEditingHdr] = useState<MsHpHdrNonPajak | null>(null);
  const [hdrForm, setHdrForm] = useState({ supplier: '', merk: '', nama: '' });
  const [hdrSaving, setHdrSaving] = useState(false);
  const [dtlModal, setDtlModal] = useState(false);
  const [selectedHdr, setSelectedHdr] = useState<MsHpHdrNonPajak | null>(null);
  const [dtlData, setDtlData] = useState<MsHpDtlNonPajak[]>([]);
  const [dtlLoading, setDtlLoading] = useState(false);
  const [newImei, setNewImei] = useState('');
  const [newHargaModal, setNewHargaModal] = useState('');
  const [newHargaJual, setNewHargaJual] = useState('');
  const [dtlSaving, setDtlSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [h, s, m] = await Promise.all([getHpNonPajakHdr(), getSuppliers(), getMerks()]);
      setData(h);
      setSuppliers(s);
      setMerks(m.filter(mk => mk.kategori === 'HP' || mk.kategori === 'HP Non Pajak'));
    } catch { /* no-op */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openDtl = async (row: MsHpHdrNonPajak) => {
    setSelectedHdr(row);
    setDtlLoading(true);
    setDtlModal(true);
    setNewImei(''); setNewHargaModal(''); setNewHargaJual('');
    try { setDtlData(await getHpNonPajakDtl(row.id)); }
    catch { /* no-op */ }
    finally { setDtlLoading(false); }
  };

  const openAddHdr = () => {
    setEditingHdr(null);
    setHdrForm({ supplier: suppliers[0]?.nama ?? '', merk: '', nama: '' });
    setHdrModal(true);
  };

  const openEditHdr = (row: MsHpHdrNonPajak) => {
    setEditingHdr(row);
    setHdrForm({ supplier: row.supplier, merk: row.merk, nama: row.nama });
    setHdrModal(true);
  };

  const handleSaveHdr = async (e: React.FormEvent) => {
    e.preventDefault();
    setHdrSaving(true);
    try {
      if (editingHdr) await updateHpNonPajakHdr(editingHdr.id, { ...hdrForm, update_by: user?.username });
      else await createHpNonPajakHdr({ ...hdrForm, create_by: user?.username });
      await load(); setHdrModal(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally { setHdrSaving(false); }
  };

  const handleAddImei = async () => {
    if (!newImei.trim() || !newHargaModal || !newHargaJual || !selectedHdr) return;
    setDtlSaving(true);
    try {
      await createHpNonPajakDtl({
        idhdr: selectedHdr.id,
        imei: newImei.trim(),
        harga_modal: parseInt(newHargaModal),
        harga_jual: parseInt(newHargaJual),
        create_by: user?.username,
      });
      setDtlData(await getHpNonPajakDtl(selectedHdr.id));
      setNewImei(''); setNewHargaModal(''); setNewHargaJual('');
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'IMEI sudah terdaftar');
    } finally { setDtlSaving(false); }
  };

  const handleDeleteDtl = async (id: number) => {
    if (!confirm('Hapus IMEI ini?')) return;
    try {
      await deleteHpNonPajakDtl(id);
      setDtlData(d => d.filter(r => r.id !== id));
      await load();
    } catch { alert('Gagal menghapus'); }
  };

  const handleDeleteHdr = async (id: number) => {
    if (!confirm('Hapus data HP Non Pajak beserta semua IMEI-nya?')) return;
    try {
      await supabase.from('ms_hp_hdr_non_pajak').delete().eq('id', id);
      setData(d => d.filter(r => r.id !== id));
    } catch { alert('Gagal menghapus'); }
  };

  const columns = [
    { key: 'nama', label: 'Model HP', render: (row: MsHpHdrNonPajak) => <strong>{row.merk} {row.nama}</strong> },
    { key: 'supplier', label: 'Supplier' },
    {
      key: 'stock', label: 'Stok',
      render: (row: MsHpHdrNonPajak) => {
        const count = (row as unknown as { ms_hp_dtl_non_pajak?: MsHpDtlNonPajak[] }).ms_hp_dtl_non_pajak?.filter(d => !d.status || d.status === 'tersedia').length ?? 0;
        return <span className={`badge ${count > 0 ? 'badge-success' : 'badge-error'}`}>{count} unit</span>;
      },
    },
    { key: 'create_time', label: 'Dibuat', render: (row: MsHpHdrNonPajak) => formatDate(row.create_time) },
    {
      key: 'actions', label: 'Aksi', width: '180px',
      render: (row: MsHpHdrNonPajak) => (
        <div className="table-actions">
          <button className="btn btn-primary btn-sm" onClick={() => openDtl(row)} id={`btn-imei-np-${row.id}`}>📱 IMEI</button>
          <button className="btn btn-outline btn-sm" onClick={() => openEditHdr(row)} id={`btn-edit-hpnp-${row.id}`}>✏️</button>
          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteHdr(row.id)} id={`btn-del-np-${row.id}`}>🗑️</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock HP Non Pajak</h1>
          <p className="page-subtitle">Kelola stok HP non-pajak berdasarkan nomor IMEI</p>
        </div>
      </div>
      <DataTable columns={columns} data={data} loading={loading} onAdd={openAddHdr} addLabel="+ Tambah Model HP Non Pajak" />

      <Modal isOpen={hdrModal} onClose={() => setHdrModal(false)} title={editingHdr ? 'Edit Model HP Non Pajak' : 'Tambah Model HP Non Pajak'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setHdrModal(false)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSaveHdr} disabled={hdrSaving} id="btn-save-hpnp">Simpan</button>
        </>}
      >
        <form onSubmit={handleSaveHdr}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group"><label className="form-label">Supplier *</label>
              <select className="form-control" value={hdrForm.supplier} onChange={e => setHdrForm(f => ({ ...f, supplier: e.target.value }))} id="hpnp-supplier">
                <option value="">-- Pilih Supplier --</option>
                {suppliers.map(s => <option key={s.id} value={s.nama}>{s.nama}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Merk *</label>
              <select className="form-control" value={hdrForm.merk} onChange={e => setHdrForm(f => ({ ...f, merk: e.target.value }))} id="hpnp-merk">
                <option value="">-- Pilih Merk --</option>
                {merks.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Nama/Model *</label>
              <input type="text" className="form-control" placeholder="Nama model HP" value={hdrForm.nama} onChange={e => setHdrForm(f => ({ ...f, nama: e.target.value }))} required id="hpnp-nama" />
            </div>
          </div>
        </form>
      </Modal>

      <Modal isOpen={dtlModal} onClose={() => setDtlModal(false)} title={`IMEI Non Pajak — ${selectedHdr?.merk} ${selectedHdr?.nama}`} size="lg"
        footer={<button className="btn btn-secondary" onClick={() => setDtlModal(false)}>Tutup</button>}
      >
        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#444' }}>+ Tambah IMEI Baru</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px auto', gap: 10, alignItems: 'flex-end' }}>
            <div className="form-group"><label className="form-label">Nomor IMEI</label>
              <input type="text" className="form-control barcode-input" placeholder="Scan atau ketik IMEI..." value={newImei} onChange={e => setNewImei(e.target.value)} id="input-imei-np" onKeyDown={e => e.key === 'Enter' && handleAddImei()} />
            </div>
            <div className="form-group"><label className="form-label">Harga Modal</label>
              <input type="number" className="form-control" value={newHargaModal} onChange={e => setNewHargaModal(e.target.value)} id="input-modal-np" />
            </div>
            <div className="form-group"><label className="form-label">Harga Jual</label>
              <input type="number" className="form-control" value={newHargaJual} onChange={e => setNewHargaJual(e.target.value)} id="input-jual-np" />
            </div>
            <button className="btn btn-success" onClick={handleAddImei} disabled={dtlSaving} id="btn-add-imei-np">+ Add</button>
          </div>
        </div>
        <table className="data-table">
          <thead><tr><th>#</th><th>IMEI</th><th>Modal</th><th>Jual</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            {dtlLoading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              : dtlData.map((d, i) => (
              <tr key={d.id}>
                <td className="text-muted text-sm">{i + 1}</td>
                <td><code style={{ fontSize: 12 }}>{d.imei}</code></td>
                <td>{formatRupiah(d.harga_modal)}</td>
                <td>{formatRupiah(d.harga_jual)}</td>
                <td><span className={`badge ${d.status === 'terjual' ? 'badge-error' : 'badge-success'}`}>{d.status === 'terjual' ? 'Terjual' : 'Tersedia'}</span></td>
                <td>
                  {(!d.status || d.status === 'tersedia') && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDtl(d.id)} id={`btn-del-imei-np-${d.id}`}>🗑️</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>
    </div>
  );
}
