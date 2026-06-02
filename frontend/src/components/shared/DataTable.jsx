import React, { useState, useMemo } from 'react';
import { IconChevronUp, IconChevronDown, IconSearch } from '@tabler/icons-react';

export default function DataTable({ columns, data = [], loading, emptyMessage = 'Sin datos', searchable = true }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(row => columns.some(col => {
      const val = col.accessor ? row[col.accessor] : '';
      return String(val || '').toLowerCase().includes(q);
    }));
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(sorted.length / pageSize);

  const toggleSort = (key) => {
    if (!key) return;
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <div className="flex flex-col h-full">
      {searchable && (
        <div className="relative mb-3">
          <IconSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Filtrar..."
            className="pl-8 pr-3 py-1.5 text-xs rounded-md outline-none w-64"
            style={{ background: '#1F2D44', border: '1px solid #1E2D45', color: '#E2E8F0' }}
          />
        </div>
      )}
      <div className="overflow-auto flex-1 rounded-lg" style={{ border: '1px solid #1E2D45' }}>
        <table className="w-full text-xs">
          <thead style={{ background: '#111827', position: 'sticky', top: 0 }}>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.accessor)}
                  className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide select-none"
                  style={{ cursor: col.accessor ? 'pointer' : 'default', fontSize: '10px', borderBottom: '1px solid #1E2D45' }}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.accessor && (
                      sortDir === 'asc' ? <IconChevronUp size={10} /> : <IconChevronDown size={10} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="text-center py-8 text-gray-600">Cargando...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center py-8 text-gray-600">{emptyMessage}</td></tr>
            ) : paged.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-[#1F2D44] transition-colors border-t border-[#1E2D45]">
                {columns.map(col => (
                  <td key={col.key} className="px-3 py-2.5">
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>{sorted.length} registros</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded disabled:opacity-40" style={{ background: '#1F2D44' }}>‹</button>
            <span className="px-2 py-1">{page}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 rounded disabled:opacity-40" style={{ background: '#1F2D44' }}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}
