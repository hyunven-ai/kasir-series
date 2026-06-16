'use client';

import { useState, useEffect } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import {
  getCctvHdr, createCctvHdr,
  getCctvDtl, createCctvDtl,
  getSuppliers, getMerks,
} from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { formatRupiah, formatDate } from '@/lib/utils';
import type { MsCctvHdr, MsCctvDtl, MsSupplier, MsMerk } from '@/lib/types';

export default function CctvPage() {
  const user = getCurrentUser();
  const [data, setData] = useState<MsCctvHdr[]>([]);
  const [suppliers, setSuppliers] = useState<MsSupplier[]>([]);
  const [merks, setMerks] = useState<MsMerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [hdrModal, setHdrModal] = useState(false);
  const [hdrForm, setHdrForm] = useState({ supplier: '', merk: '', nama: '' });
  const [hdrSaving, setHdrSaving] = useState(false);
  const [dtlModal, setDtlModal] = useState(false);
  const [selectedHdr, setSelectedHdr] = useState<MsCctvHdr | null>(null);
  const [dtlData, setDtlData] = useState<MsCctvDtl[]>([]);
  const [dtlLoading, setDtlLoading] = useState(false);
  const [newSn, setNewSn] = useState('');
  const [newHargaModal, setNewHargaModal] = useState('');
  const [newHargaJual, setNewHargaJual] = useState('');
  const [dtlSaving, setDtlSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [h, s, m] = await Promise.all([getCctvHdr(), getSuppliers(), getMerks()]);
      setData(h); setSuppliers(s);
      setMerks(m.filter(mk => mk.kategori === 'CCTV'));
    } catch { /* no-op */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openDtl = async (row: MsCctvHdr) => {
    setSelectedHdr(row);
    setDtlLoading(true);
    setDtlModal(true);
    setNewSn(''); setNewHargaModal(''); setNewHargaJual('');
    try { setDtlData(await getCctvDtl(row.id)); }
    catch { /* no-op */ }
    finally { setDtlLoading(false); }
  };

  const handleSaveHdr = async (e: React.FormEvent) => {
    e.preventDefault();
    setHdrSaving(true);
    try {
      await createCctvHdr({ ...hdrForm, create_by: user?.username });
      await load(); setHdrModal(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally { setHdrSaving(false); }
  };

  const handleAddSn = async () => {
    if (!newSn.trim() || !newHargaModal || !newHargaJual || !selectedHdr) return;
    setDtlSaving(true);
    try {
      await createCctvDtl({
        idhdr: selectedHdr.id,
        sn_cctv: newSn.trim(),
        harga_modal: parseInt(newHargaModal),
        harga_jual: parseInt(newHargaJual),
        create_by: user?.username,
      });
      setDtlData(await getCctvDtl(selectedHdr.id));
      setNewSn(''); setNewHargaModal(''); setNewHargaJual('');
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'SN sudah terdaftar');
    } finally { setDtlSaving(false); }
  };

  const handleDeleteHdr = async (id: number) => {
    if (!confirm('Hapus CCTV beserta semua SN-nya?')) return;
    try {
      await supabase.from('ms_cctv_hdr').delete().eq('id', id);
      setData(d => d.filter(r => r.id !== id));
    } catch { alert('Gagal menghapus'); }
  };

  const columns = [
    { key: 'nama', label: 'Model CCTV', render: (row: MsCctvHdr) => <strong>{row.merk} {row.nama}</strong> },
    { key: 'supplier', label: 'Supplier' },
    {
      key: 'stock', label: 'Stok (SN)',
      render: (row: MsCctvHdr) => {
        const count = (row as unknown as { ms_cctv_dtl?: MsCctvDtl[] }).ms_cctv_dtl?.filter(d => !d.status || d.status === 'tersedia').length ?? 0;
        return <span className={`badge ${count > 0 ? 'badge-success' : 'badge-error'}`}>{count} unit</span>;
      },
    },
    { key: 'create_time', label: 'Dibuat', render: (row: MsCctvHdr) => formatDate(row.create_time) },
    {
      key: 'actions', label: 'Aksi', width: '180px',
      render: (row: MsCctvHdr) => (
        <div className="table-actions">
          <button className="btn btn-primary btn-sm" onClick={() => openDtl(row)} id={`btn-sn-${row.id}`}>📷 SN</button>
          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteHdr(row.id)} id={`btn-del-cctv-${row.id}`}>🗑️</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock CCTV</h1>
          <p className="page-subtitle">Kelola stok CCTV berdasarkan Serial Number (SN)</p>
        </div>
      </div>

      <DataTable columns={columns} data={data} loading={loading} onAdd={() => { setHdrForm({ supplier: suppliers[0]?.nama ?? '', merk: '', nama: '' }); setHdrModal(true); }} addLabel="+ Tambah Model CCTV" />

      <Modal isOpen={hdrModal} onClose={() => setHdrModal(false)} title="Tambah Model CCTV"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setHdrModal(false)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSaveHdr} disabled={hdrSaving} id="btn-save-cctv-hdr">Simpan</button>
        </>}
      >
        <form onSubmit={handleSaveHdr}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group"><label className="form-label">Supplier *</label>
              <select className="form-control" value={hdrForm.supplier} onChange={e => setHdrForm(f => ({ ...f, supplier: e.target.value }))} id="cctv-supplier">
                <option value="">-- Pilih Supplier --</option>
                {suppliers.map(s => <option key={s.id} value={s.nama}>{s.nama}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Merk *</label>
              <select className="form-control" value={hdrForm.merk} onChange={e => setHdrForm(f => ({ ...f, merk: e.target.value }))} id="cctv-merk">
                <option value="">-- Pilih Merk --</option>
                {merks.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Nama/Model *</label>
              <input type="text" className="form-control" placeholder="Contoh: Hikvision DS-2CD2143G2-I" value={hdrForm.nama} onChange={e => setHdrForm(f => ({ ...f, nama: e.target.value }))} required id="cctv-nama" />
            </div>
          </div>
        </form>
      </Modal>

      <Modal isOpen={dtlModal} onClose={() => setDtlModal(false)} title={`SN CCTV — ${selectedHdr?.merk} ${selectedHdr?.nama}`} size="lg"
        footer={<button className="btn btn-secondary" onClick={() => setDtlModal(false)}>Tutup</button>}
      >
        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>+ Tambah SN Baru</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px auto', gap: 10, alignItems: 'flex-end' }}>
            <div className="form-group"><label className="form-label">Serial Number</label>
              <input type="text" className="form-control barcode-input" placeholder="Scan atau ketik SN..." value={newSn} onChange={e => setNewSn(e.target.value)} id="input-sn" onKeyDown={e => e.key === 'Enter' && handleAddSn()} />
            </div>
            <div className="form-group"><label className="form-label">Harga Modal</label>
              <input type="number" className="form-control" value={newHargaModal} onChange={e => setNewHargaModal(e.target.value)} id="input-modal-cctv" />
            </div>
            <div className="form-group"><label className="form-label">Harga Jual</label>
              <input type="number" className="form-control" value={newHargaJual} onChange={e => setNewHargaJual(e.target.value)} id="input-jual-cctv" />
            </div>
            <button className="btn btn-success" onClick={handleAddSn} disabled={dtlSaving} id="btn-add-sn">+ Add</button>
          </div>
        </div>
        <table className="data-table">
          <thead><tr><th>#</th><th>Serial Number</th><th>Modal</th><th>Jual</th><th>Status</th></tr></thead>
          <tbody>
            {dtlLoading ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              : dtlData.map((d, i) => (
              <tr key={d.id}>
                <td className="text-muted text-sm">{i + 1}</td>
                <td><code style={{ fontSize: 12 }}>{d.sn_cctv}</code></td>
                <td>{formatRupiah(d.harga_modal)}</td>
                <td>{formatRupiah(d.harga_jual)}</td>
                <td><span className={`badge ${d.status === 'terjual' ? 'badge-error' : 'badge-success'}`}>{d.status === 'terjual' ? 'Terjual' : 'Tersedia'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>
    </div>
  );
}
