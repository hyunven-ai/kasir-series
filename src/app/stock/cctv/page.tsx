'use client';

import { useState, useEffect } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import {
  getCctvHdr, createCctvHdr, updateCctvHdr,
  getCctvDtl, createCctvDtl, deleteCctvDtl, updateCctvDtl,
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
  const [editingHdr, setEditingHdr] = useState<MsCctvHdr | null>(null);
  const [hdrForm, setHdrForm] = useState({ supplier: '', merk: '', nama: '' });
  const [hdrSaving, setHdrSaving] = useState(false);
  const [dtlModal, setDtlModal] = useState(false);
  const [selectedHdr, setSelectedHdr] = useState<MsCctvHdr | null>(null);
  const [dtlData, setDtlData] = useState<MsCctvDtl[]>([]);
  const [dtlLoading, setDtlLoading] = useState(false);
  const [snRows, setSnRows] = useState<{ sn: string; warna: string }[]>([{ sn: '', warna: '' }]);
  const [newHargaModal, setNewHargaModal] = useState('');
  const [newHargaJual, setNewHargaJual] = useState('');
  const [dtlSaving, setDtlSaving] = useState(false);
  const [editingDtl, setEditingDtl] = useState<MsCctvDtl | null>(null);
  const [editDtlModal, setEditDtlModal] = useState(false);
  const [editDtlForm, setEditDtlForm] = useState({ sn_cctv: '', warna: '', harga_modal: '', harga_jual: '' });

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
    setSnRows([{ sn: '', warna: '' }]); setNewHargaModal(''); setNewHargaJual('');
    try { setDtlData(await getCctvDtl(row.id)); }
    catch { /* no-op */ }
    finally { setDtlLoading(false); }
  };

  const openAddHdr = () => {
    setEditingHdr(null);
    setHdrForm({ supplier: suppliers[0]?.nama ?? '', merk: '', nama: '' });
    setHdrModal(true);
  };

  const openEditHdr = (row: MsCctvHdr) => {
    setEditingHdr(row);
    setHdrForm({ supplier: row.supplier, merk: row.merk, nama: row.nama });
    setHdrModal(true);
  };

  const handleSaveHdr = async (e: React.FormEvent) => {
    e.preventDefault();
    setHdrSaving(true);
    try {
      if (editingHdr) await updateCctvHdr(editingHdr.id, { ...hdrForm, update_by: user?.username });
      else await createCctvHdr({ ...hdrForm, create_by: user?.username });
      await load(); setHdrModal(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally { setHdrSaving(false); }
  };

  const handleAddSn = async () => {
    const activeRows = snRows.filter(r => r.sn.trim());
    if (activeRows.length === 0 || !newHargaModal || !newHargaJual || !selectedHdr) return;
    setDtlSaving(true);
    let successCount = 0;
    let failSns: string[] = [];
    
    for (const row of activeRows) {
      try {
        await createCctvDtl({
          idhdr: selectedHdr.id,
          sn_cctv: row.sn.trim(),
          warna: row.warna.trim() || undefined,
          harga_modal: parseInt(newHargaModal),
          harga_jual: parseInt(newHargaJual),
          create_by: user?.username,
        });
        successCount++;
      } catch {
        failSns.push(row.sn);
      }
    }
    
    setDtlData(await getCctvDtl(selectedHdr.id));
    await load(); // refresh stock count
    
    if (failSns.length > 0) {
      alert(`Berhasil menambahkan ${successCount} SN. Gagal: ${failSns.join(', ')} (Kemungkinan duplikat/sudah terdaftar).`);
      setSnRows(failSns.map(sn => {
        const found = snRows.find(r => r.sn === sn);
        return { sn, warna: found?.warna || '' };
      }));
    } else {
      setSnRows([{ sn: '', warna: '' }]);
      setNewHargaModal('');
      setNewHargaJual('');
    }
    setDtlSaving(false);
  };

  const handleDeleteDtl = async (id: number) => {
    if (!confirm('Hapus SN ini?')) return;
    try {
      await deleteCctvDtl(id);
      setDtlData(d => d.filter(r => r.id !== id));
      await load();
    } catch { alert('Gagal menghapus'); }
  };

  const openEditDtl = (row: MsCctvDtl) => {
    setEditingDtl(row);
    setEditDtlForm({
      sn_cctv: row.sn_cctv,
      warna: row.warna || '',
      harga_modal: String(row.harga_modal),
      harga_jual: String(row.harga_jual),
    });
    setEditDtlModal(true);
  };

  const handleSaveDtl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDtl || !selectedHdr) return;
    try {
      await updateCctvDtl(editingDtl.id, {
        sn_cctv: editDtlForm.sn_cctv.trim(),
        warna: editDtlForm.warna.trim() || undefined,
        harga_modal: parseInt(editDtlForm.harga_modal),
        harga_jual: parseInt(editDtlForm.harga_jual),
        update_by: user?.username,
      });
      setDtlData(await getCctvDtl(selectedHdr.id));
      await load();
      setEditDtlModal(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Gagal mengubah detail');
    }
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
          <button className="btn btn-outline btn-sm" onClick={() => openEditHdr(row)} id={`btn-edit-cctv-${row.id}`}>✏️</button>
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

      <DataTable columns={columns} data={data} loading={loading} onAdd={openAddHdr} addLabel="+ Tambah Model CCTV" />

      <Modal isOpen={hdrModal} onClose={() => setHdrModal(false)} title={editingHdr ? 'Edit Model CCTV' : 'Tambah Model CCTV'}
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
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#444' }}>+ Tambah SN Baru</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px auto', gap: 10, alignItems: 'flex-end' }}>
            <div className="form-group">
              <label className="form-label">Serial Number & Warna</label>
              {snRows.map((row, index) => (
                <div key={index} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input
                    type="text" className="form-control barcode-input"
                    placeholder={`SN ${index + 1}`}
                    value={row.sn}
                    onChange={e => {
                      const updated = [...snRows];
                      updated[index].sn = e.target.value;
                      setSnRows(updated);
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleAddSn()}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text" className="form-control"
                    placeholder="Warna"
                    value={row.warna}
                    onChange={e => {
                      const updated = [...snRows];
                      updated[index].warna = e.target.value;
                      setSnRows(updated);
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleAddSn()}
                    style={{ width: 120 }}
                  />
                  {snRows.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-danger btn-icon btn-sm"
                      onClick={() => setSnRows(prev => prev.filter((_, idx) => idx !== index))}
                      style={{ width: 28, height: 28, flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setSnRows(prev => [...prev, { sn: '', warna: '' }])}
                style={{ marginTop: 4, height: 28, padding: '2px 8px', fontSize: 11 }}
              >
                + Tambah Baris SN
              </button>
            </div>
            <div className="form-group" style={{ alignSelf: 'flex-start' }}>
              <label className="form-label">Harga Modal</label>
              <input type="number" className="form-control" placeholder="0" value={newHargaModal} onChange={e => setNewHargaModal(e.target.value)} id="input-modal-cctv" />
            </div>
            <div className="form-group" style={{ alignSelf: 'flex-start' }}>
              <label className="form-label">Harga Jual</label>
              <input type="number" className="form-control" placeholder="0" value={newHargaJual} onChange={e => setNewHargaJual(e.target.value)} id="input-jual-cctv" />
            </div>
            <button className="btn btn-success" onClick={handleAddSn} disabled={dtlSaving} id="btn-add-sn" style={{ alignSelf: 'flex-start', marginTop: 20 }}>
              {dtlSaving ? '...' : '+ Add'}
            </button>
          </div>
        </div>

        {/* SN List */}
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#444' }}>
          Daftar SN ({dtlData.length} unit)
        </div>
        <DataTable
          columns={[
            { key: 'sn_cctv', label: 'Serial Number', render: (row: MsCctvDtl) => <code style={{ fontSize: 12 }}>{row.sn_cctv}</code> },
            { key: 'warna', label: 'Warna', render: (row: MsCctvDtl) => row.warna || '-' },
            { key: 'harga_modal', label: 'Harga Modal', render: (row: MsCctvDtl) => formatRupiah(row.harga_modal) },
            { key: 'harga_jual', label: 'Harga Jual', render: (row: MsCctvDtl) => formatRupiah(row.harga_jual) },
            { key: 'create_time', label: 'Tanggal Masuk', render: (row: MsCctvDtl) => formatDate(row.create_time) },
            {
              key: 'status', label: 'Status',
              render: (row: MsCctvDtl) => (
                <span className={`badge ${row.status === 'terjual' ? 'badge-error' : 'badge-success'}`}>
                  {row.status === 'terjual' ? 'Terjual' : 'Tersedia'}
                </span>
              ),
            },
            {
              key: 'actions', label: 'Aksi', width: '100px',
              render: (row: MsCctvDtl) => (
                (!row.status || row.status === 'tersedia') ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEditDtl(row)} id={`btn-edit-dtl-cctv-${row.id}`}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDtl(row.id)} id={`btn-del-sn-${row.id}`}>🗑️</button>
                  </div>
                ) : null
              ),
            },
          ]}
          data={dtlData}
          loading={dtlLoading}
          searchable={true}
        />
      </Modal>

      {/* Edit Detail Modal */}
      <Modal isOpen={editDtlModal} onClose={() => setEditDtlModal(false)} title="Edit Detail SN CCTV"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditDtlModal(false)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSaveDtl} id="btn-save-dtl-edit-cctv">Simpan</button>
          </>
        }
      >
        <form onSubmit={handleSaveDtl}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Serial Number *</label>
              <input type="text" className="form-control" value={editDtlForm.sn_cctv} onChange={e => setEditDtlForm(f => ({ ...f, sn_cctv: e.target.value }))} required id="edit-dtl-sn-cctv" />
            </div>
            <div className="form-group">
              <label className="form-label">Warna</label>
              <input type="text" className="form-control" value={editDtlForm.warna} onChange={e => setEditDtlForm(f => ({ ...f, warna: e.target.value }))} id="edit-dtl-warna-cctv" />
            </div>
            <div className="form-group">
              <label className="form-label">Harga Modal *</label>
              <input type="number" className="form-control" value={editDtlForm.harga_modal} onChange={e => setEditDtlForm(f => ({ ...f, harga_modal: e.target.value }))} required id="edit-dtl-modal-cctv" />
            </div>
            <div className="form-group">
              <label className="form-label">Harga Jual *</label>
              <input type="number" className="form-control" value={editDtlForm.harga_jual} onChange={e => setEditDtlForm(f => ({ ...f, harga_jual: e.target.value }))} required id="edit-dtl-jual-cctv" />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
