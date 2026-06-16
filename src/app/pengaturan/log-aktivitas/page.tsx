'use client';

import { useState } from 'react';
import DataTable from '@/components/ui/DataTable';
import { formatDateTime } from '@/lib/utils';

const DEMO_LOGS = [
  { id: 1, user: 'admin', aksi: 'UPDATE', tabel: 'ms_hp_dtl', detail: 'Ubah harga jual IMEI 356789012345678 → Rp 4.500.000', waktu: new Date().toISOString() },
  { id: 2, user: 'admin', aksi: 'INSERT', tabel: 'ms_aksesoris', detail: 'Tambah aksesoris: Samsung Case (qty: 50)', waktu: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, user: 'gudang', aksi: 'DELETE', tabel: 'ms_merk', detail: 'Hapus merk: "Unknown" (id: 15)', waktu: new Date(Date.now() - 7200000).toISOString() },
  { id: 4, user: 'kasir', aksi: 'INSERT', tabel: 'trs_penjualan_hdr', detail: 'Penjualan INV/260615/0042 — Total: Rp 1.200.000', waktu: new Date(Date.now() - 10800000).toISOString() },
  { id: 5, user: 'admin', aksi: 'UPDATE', tabel: 'ms_hp_hdr', detail: 'Ubah nama model: "iPhone 15" → "iPhone 15 Pro"', waktu: new Date(Date.now() - 14400000).toISOString() },
];

const AKSI_COLORS: Record<string, string> = {
  INSERT: 'badge-success',
  UPDATE: 'badge-warning',
  DELETE: 'badge-error',
  SELECT: 'badge-info',
};

export default function LogAktivitasPage() {
  const [logs] = useState(DEMO_LOGS);

  const columns = [
    {
      key: 'waktu', label: 'Waktu',
      render: (row: typeof DEMO_LOGS[0]) => (
        <span style={{ fontSize: 12, color: '#888' }}>{formatDateTime(row.waktu)}</span>
      ),
    },
    {
      key: 'user', label: 'User',
      render: (row: typeof DEMO_LOGS[0]) => (
        <code style={{ fontSize: 12, background: '#f0f4ff', padding: '2px 6px', borderRadius: 4 }}>@{row.user}</code>
      ),
    },
    {
      key: 'aksi', label: 'Aksi',
      render: (row: typeof DEMO_LOGS[0]) => (
        <span className={`badge ${AKSI_COLORS[row.aksi] ?? 'badge-gray'}`}>{row.aksi}</span>
      ),
    },
    {
      key: 'tabel', label: 'Tabel',
      render: (row: typeof DEMO_LOGS[0]) => (
        <code style={{ fontSize: 11, color: '#666' }}>{row.tabel}</code>
      ),
    },
    {
      key: 'detail', label: 'Detail',
      render: (row: typeof DEMO_LOGS[0]) => (
        <span style={{ fontSize: 12 }}>{row.detail}</span>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Log Aktivitas</h1>
          <p className="page-subtitle">Audit trail — rekam jejak semua perubahan data oleh pengguna</p>
        </div>
      </div>

      <div className="alert alert-info mb-16">
        💡 Log ini memanfaatkan kolom <code>create_by</code> dan <code>update_by</code> yang tersimpan di setiap tabel database.
        Integrasi penuh dengan PostgreSQL trigger tersedia setelah koneksi Supabase dikonfigurasi.
      </div>

      <DataTable
        columns={columns as Parameters<typeof DataTable>[0]['columns']}
        data={logs as unknown as Record<string, unknown>[]}
      />
    </div>
  );
}
