'use client';

import { useState, useMemo } from 'react';

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  searchable?: boolean;
  loading?: boolean;
  onAdd?: () => void;
  addLabel?: string;
  extraActions?: React.ReactNode;
}

export default function DataTable<T extends object>({
  columns,
  data,
  keyField = 'id',
  searchable = true,
  loading = false,
  onAdd,
  addLabel = 'Tambah',
  extraActions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="table-container">
      <div className="table-toolbar">
        {searchable && (
          <div className="table-search">
            <svg className="table-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="form-control"
              placeholder="Cari..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              id="table-search"
            />
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {extraActions}
          {onAdd && (
            <button className="btn btn-primary" onClick={onAdd} id="btn-add">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {addLabel}
            </button>
          )}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              {columns.map(col => (
                <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: 40 }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <div className="empty-state-text">
                      {search ? 'Tidak ada data yang cocok' : 'Belum ada data'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((row, idx) => (
                <tr key={String((row as Record<string, unknown>)[keyField] ?? idx)}>
                  <td className="text-muted text-sm">{(page - 1) * pageSize + idx + 1}</td>
                  {columns.map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filtered.length > pageSize && (
        <div className="table-pagination">
          <span>
            Menampilkan {Math.min((page - 1) * pageSize + 1, filtered.length)}–{Math.min(page * pageSize, filtered.length)} dari {filtered.length} data
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ‹ Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <button
                  key={p}
                  className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              );
            })}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
