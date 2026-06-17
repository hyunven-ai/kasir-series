'use client';

import { useState, useEffect } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import {
  getHpHdr, createHpHdr, updateHpHdr, deleteHpHdr,
  getHpDtl, createHpDtl, deleteHpDtl,
  getSuppliers, getMerks,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatRupiah, formatDate } from '@/lib/utils';
import type { MsHpHdr, MsHpDtl, MsSupplier, MsMerk } from '@/lib/types';

export default function HpPage() {
  const user = getCurrentUser();
  const [data, setData] = useState<MsHpHdr[]>([]);
  const [suppliers, setSuppliers] = useState<MsSupplier[]>([]);
  const [merks, setMerks] = useState<MsMerk[]>([]);
  const [loading, setLoading] = useState(true);

  // Header modal
  const [hdrModal, setHdrModal] = useState(false);
  const [editingHdr, setEditingHdr] = useState<MsHpHdr | null>(null);
  const [hdrForm, setHdrForm] = useState({ supplier: '', merk: '', nama: '' });
  const [hdrSaving, setHdrSaving] = useState(false);
  const [hdrError, setHdrError] = useState('');

  // Detail modal (IMEI input)
  const [dtlModal, setDtlModal] = useState(false);
  const [selectedHdr, setSelectedHdr] = useState<MsHpHdr | null>(null);
  const [dtlData, setDtlData] = useState<MsHpDtl[]>([]);
  const [dtlLoading, setDtlLoading] = useState(false);
  const [newHargaModal, setNewHargaModal] = useState('');
  const [newHargaJual, setNewHargaJual] = useState('');
  const [dtlSaving, setDtlSaving] = useState(false);
  const [imeiRows, setImeiRows] = useState<{ imei: string; warna: string }[]>([{ imei: '', warna: '' }]);

  const load = async () => {
    setLoading(true);
    try {
      const [h, s, m] = await Promise.all([getHpHdr(), getSuppliers(), getMerks()]);
      setData(h);
      setSuppliers(s);
      setMerks(m.filter(mk => mk.kategori === 'HP'));
    } catch { /* no-op */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAddHdr = () => {
    setEditingHdr(null);
    setHdrForm({ supplier: suppliers[0]?.nama ?? '', merk: '', nama: '' });
    setHdrModal(true);
  };

  const openEditHdr = (row: MsHpHdr) => {
    setEditingHdr(row);
    setHdrForm({ supplier: row.supplier, merk: row.merk, nama: row.nama });
    setHdrModal(true);
  };

  const handleSaveHdr = async (e: React.FormEvent) => {
    e.preventDefault();
    setHdrSaving(true); setHdrError('');
    try {
      if (editingHdr) await updateHpHdr(editingHdr.id, { ...hdrForm, update_by: user?.username });
      else await createHpHdr({ ...hdrForm, create_by: user?.username });
      await load(); setHdrModal(false);
    } catch (e: unknown) {
      setHdrError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally { setHdrSaving(false); }
  };

  const openDtl = async (row: MsHpHdr) => {
    setSelectedHdr(row);
    setDtlLoading(true);
    setDtlModal(true);
    setImeiRows([{ imei: '', warna: '' }]); setNewHargaModal(''); setNewHargaJual('');
    try { setDtlData(await getHpDtl(row.id)); }
    catch { /* no-op */ }
    finally { setDtlLoading(false); }
  };

  const handleAddImei = async () => {
    const activeRows = imeiRows.filter(r => r.imei.trim());
    if (activeRows.length === 0 || !newHargaModal || !newHargaJual || !selectedHdr) return;
    setDtlSaving(true);
    let successCount = 0;
    let failImeis: string[] = [];
    
    for (const row of activeRows) {
      try {
        await createHpDtl({
          idhdr: selectedHdr.id,
          imei: row.imei.trim(),
          warna: row.warna.trim() || undefined,
          harga_modal: parseInt(newHargaModal),
          harga_jual: parseInt(newHargaJual),
          create_by: user?.username,
        });
        successCount++;
      } catch {
        failImeis.push(row.imei);
      }
    }
    
    setDtlData(await getHpDtl(selectedHdr.id));
    await load(); // refresh stock count
    
    if (failImeis.length > 0) {
      alert(`Berhasil menambahkan ${successCount} IMEI. Gagal: ${failImeis.join(', ')} (Kemungkinan duplikat/sudah terdaftar).`);
      setImeiRows(failImeis.map(imei => {
        const found = imeiRows.find(r => r.imei === imei);
        return { imei, warna: found?.warna || '' };
      }));
    } else {
      setImeiRows([{ imei: '', warna: '' }]);
      setNewHargaModal('');
      setNewHargaJual('');
    }
    setDtlSaving(false);
  };

  const handleDeleteDtl = async (id: number) => {
    if (!confirm('Hapus IMEI ini?')) return;
    try {
      await deleteHpDtl(id);
      setDtlData(d => d.filter(r => r.id !== id));
      await load();
    } catch { alert('Gagal menghapus'); }
  };

  const handleDeleteHdr = async (id: number) => {
    if (!confirm('Hapus data HP beserta semua IMEI-nya?')) return;
    try { await deleteHpHdr(id); setData(d => d.filter(r => r.id !== id)); }
    catch { alert('Gagal menghapus'); }
  };

  const hpMerks = merks.filter(m => m.kategori === 'HP' || m.kategori === 'HP Non Pajak');

  const columns = [
    { key: 'nama', label: 'Model HP', render: (row: MsHpHdr) => <strong>{row.merk} {row.nama}</strong> },
    { key: 'supplier', label: 'Supplier', render: (row: MsHpHdr) => row.supplier },
    {
      key: 'stock', label: 'Stok (IMEI)',
      render: (row: MsHpHdr) => {
        const count = (row as unknown as { ms_hp_dtl?: MsHpDtl[] }).ms_hp_dtl?.filter(d => !d.status || d.status === 'tersedia').length ?? 0;
        return (
          <span className={`badge ${count > 0 ? 'badge-success' : 'badge-error'}`}>
            {count} unit
          </span>
        );
      },
    },
    { key: 'create_time', label: 'Dibuat', render: (row: MsHpHdr) => formatDate(row.create_time) },
    {
      key: 'actions', label: 'Aksi', width: '180px',
      render: (row: MsHpHdr) => (
        <div className="table-actions">
          <button className="btn btn-primary btn-sm" onClick={() => openDtl(row)} title="Kelola IMEI" id={`btn-imei-${row.id}`}>
            📱 IMEI
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => openEditHdr(row)} id={`btn-edit-hp-${row.id}`}>✏️</button>
          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteHdr(row.id)} id={`btn-del-hp-${row.id}`}>🗑️</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock HP</h1>
          <p className="page-subtitle">Kelola stok handphone berdasarkan nomor IMEI</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading} onAdd={openAddHdr} addLabel="+ Tambah Model HP"
      />

      {/* Header Modal */}
      <Modal isOpen={hdrModal} onClose={() => setHdrModal(false)} title={editingHdr ? 'Edit Model HP' : 'Tambah Model HP'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setHdrModal(false)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSaveHdr} disabled={hdrSaving} id="btn-save-hp-hdr">
              {hdrSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </>
        }
      >
        {hdrError && <div className="alert alert-error mb-16">{hdrError}</div>}
        <form onSubmit={handleSaveHdr}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Supplier *</label>
              <select className="form-control" value={hdrForm.supplier} onChange={e => setHdrForm(f => ({ ...f, supplier: e.target.value }))} id="hp-supplier">
                <option value="">-- Pilih Supplier --</option>
                {suppliers.map(s => <option key={s.id} value={s.nama}>{s.nama}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Merk *</label>
              <select className="form-control" value={hdrForm.merk} onChange={e => setHdrForm(f => ({ ...f, merk: e.target.value }))} id="hp-merk">
                <option value="">-- Pilih Merk --</option>
                {merks.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nama/Model *</label>
              <input type="text" className="form-control" placeholder="Contoh: iPhone 15 Pro Max 256GB" value={hdrForm.nama} onChange={e => setHdrForm(f => ({ ...f, nama: e.target.value }))} required id="hp-nama" />
            </div>
          </div>
        </form>
      </Modal>

      {/* Detail IMEI Modal */}
      <Modal isOpen={dtlModal} onClose={() => setDtlModal(false)} title={`IMEI — ${selectedHdr?.merk} ${selectedHdr?.nama}`} size="lg"
        footer={<button className="btn btn-secondary" onClick={() => setDtlModal(false)}>Tutup</button>}
      >
        {/* Add IMEI form */}
        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#444' }}>+ Tambah IMEI Baru</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px auto', gap: 10, alignItems: 'flex-end' }}>
            <div className="form-group">
              <label className="form-label">IMEI & Warna</label>
              {imeiRows.map((row, index) => (
                <div key={index} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input
                    type="text" className="form-control barcode-input"
                    placeholder={`IMEI ${index + 1}`}
                    value={row.imei}
                    onChange={e => {
                      const updated = [...imeiRows];
                      updated[index].imei = e.target.value;
                      setImeiRows(updated);
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleAddImei()}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text" className="form-control"
                    placeholder="Warna"
                    value={row.warna}
                    onChange={e => {
                      const updated = [...imeiRows];
                      updated[index].warna = e.target.value;
                      setImeiRows(updated);
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleAddImei()}
                    style={{ width: 120 }}
                  />
                  {imeiRows.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-danger btn-icon btn-sm"
                      onClick={() => setImeiRows(prev => prev.filter((_, idx) => idx !== index))}
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
                onClick={() => setImeiRows(prev => [...prev, { imei: '', warna: '' }])}
                style={{ marginTop: 4, height: 28, padding: '2px 8px', fontSize: 11 }}
              >
                + Tambah Baris IMEI
              </button>
            </div>
            <div className="form-group" style={{ alignSelf: 'flex-start' }}>
              <label className="form-label">Harga Modal</label>
              <input type="number" className="form-control" placeholder="0" value={newHargaModal} onChange={e => setNewHargaModal(e.target.value)} id="input-modal-hp" />
            </div>
            <div className="form-group" style={{ alignSelf: 'flex-start' }}>
              <label className="form-label">Harga Jual</label>
              <input type="number" className="form-control" placeholder="0" value={newHargaJual} onChange={e => setNewHargaJual(e.target.value)} id="input-jual-hp" />
            </div>
            <button className="btn btn-success" onClick={handleAddImei} disabled={dtlSaving} id="btn-add-imei" style={{ alignSelf: 'flex-start', marginTop: 20 }}>
              {dtlSaving ? '...' : '+ Add'}
            </button>
          </div>
        </div>

        {/* IMEI List */}
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#444' }}>
          Daftar IMEI ({dtlData.length} unit)
        </div>
        <DataTable
          columns={[
            { key: 'imei', label: 'IMEI', render: (row: MsHpDtl) => <code style={{ fontSize: 12 }}>{row.imei}</code> },
            { key: 'warna', label: 'Warna', render: (row: MsHpDtl) => row.warna || '-' },
            { key: 'harga_modal', label: 'Harga Modal', render: (row: MsHpDtl) => formatRupiah(row.harga_modal) },
            { key: 'harga_jual', label: 'Harga Jual', render: (row: MsHpDtl) => formatRupiah(row.harga_jual) },
            { key: 'create_time', label: 'Tanggal Masuk', render: (row: MsHpDtl) => formatDate(row.create_time) },
            {
              key: 'status', label: 'Status',
              render: (row: MsHpDtl) => (
                <span className={`badge ${row.status === 'terjual' ? 'badge-error' : 'badge-success'}`}>
                  {row.status === 'terjual' ? 'Terjual' : 'Tersedia'}
                </span>
              ),
            },
            {
              key: 'actions', label: 'Aksi', width: '60px',
              render: (row: MsHpDtl) => (
                (!row.status || row.status === 'tersedia') ? (
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDtl(row.id)} id={`btn-del-imei-${row.id}`}>🗑️</button>
                ) : null
              ),
            },
          ]}
          data={dtlData}
          loading={dtlLoading}
          searchable={true}
        />
      </Modal>
    </div>
  );
}
