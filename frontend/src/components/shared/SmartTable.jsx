import React, { useState, useMemo } from 'react';
import { IconChevronUp, IconChevronDown } from '@tabler/icons-react';
import Pagination from './Pagination';

/**
 * SmartTable — tabla paginada y sorteable al estilo SmartOLT DataTables.
 *
 * Soporta dos modos:
 *   - Client-side: pasar `data`. La tabla filtra/sortea/pagina localmente.
 *   - Server-side: pasar `data` (solo la página actual) + `totalItems` + callbacks.
 *
 * @param {Object[]} columns          - [{ key, label, render?, sortKey?, width?, align? }]
 * @param {Object[]} data             - filas (página actual en server-side)
 * @param {number}   totalItems       - total de items para paginación
 * @param {boolean}  loading          - muestra skeleton
 * @param {boolean}  serverSide       - si true, no pagina/sortea localmente
 * @param {number}   page             - página actual (server-side)
 * @param {number}   pageSize         - tamaño de página (server-side)
 * @param {string}   sortKey          - columna sort activa (server-side)
 * @param {string}   sortDir          - 'asc' | 'desc' (server-side)
 * @param {function} onPageChange     - (page: number) => void
 * @param {function} onPageSizeChange - (size: number) => void
 * @param {function} onSortChange     - (key: string, dir: 'asc'|'desc') => void
 * @param {boolean}  selectable       - checkbox por fila
 * @param {string[]} selectedIds      - ids seleccionados
 * @param {function} onSelectChange   - (ids: string[]) => void
 * @param {string}   rowKey           - campo identificador (default: 'id')
 * @param {string}   emptyMessage     - texto vacío
 * @param {string}   className        - clase extra
 */
export default function SmartTable({
  columns = [],
  data = [],
  totalItems,
  loading = false,
  serverSide = false,
  page: pageProp = 1,
  pageSize: pageSizeProp = 25,
  sortKey: sortKeyProp = null,
  sortDir: sortDirProp = 'asc',
  onPageChange,
  onPageSizeChange,
  onSortChange,
  selectable = false,
  selectedIds = [],
  onSelectChange,
  rowKey = 'id',
  emptyMessage = 'No data',
  className = '',
}) {
  const [clientPage, setClientPage]         = useState(1);
  const [clientPageSize, setClientPageSize] = useState(25);
  const [clientSortKey, setClientSortKey]   = useState(null);
  const [clientSortDir, setClientSortDir]   = useState('asc');

  const page     = serverSide ? pageProp     : clientPage;
  const pageSize = serverSide ? pageSizeProp : clientPageSize;
  const sortKey  = serverSide ? sortKeyProp  : clientSortKey;
  const sortDir  = serverSide ? sortDirProp  : clientSortDir;

  const handlePageChange = (p) => {
    if (serverSide) onPageChange?.(p);
    else setClientPage(p);
  };
  const handlePageSizeChange = (s) => {
    if (serverSide) { onPageSizeChange?.(s); onPageChange?.(1); }
    else { setClientPageSize(s); setClientPage(1); }
  };
  const handleSort = (key) => {
    if (!key) return;
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    if (serverSide) onSortChange?.(key, newDir);
    else { setClientSortKey(key); setClientSortDir(newDir); setClientPage(1); }
  };

  const processed = useMemo(() => {
    if (serverSide) return data;
    let rows = [...data];
    if (clientSortKey) {
      rows.sort((a, b) => {
        const va = a[clientSortKey] ?? '';
        const vb = b[clientSortKey] ?? '';
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        return clientSortDir === 'asc' ? cmp : -cmp;
      });
    }
    const start = (clientPage - 1) * clientPageSize;
    return rows.slice(start, start + clientPageSize);
  }, [serverSide, data, clientSortKey, clientSortDir, clientPage, clientPageSize]);

  const total = totalItems ?? (serverSide ? 0 : data.length);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const allPageIds  = processed.map(r => String(r[rowKey]));
  const allSelected = allPageIds.length > 0 && allPageIds.every(id => selectedIds.includes(id));
  const someSelected = !allSelected && allPageIds.some(id => selectedIds.includes(id));

  const toggleAll = () => {
    if (allSelected) onSelectChange?.(selectedIds.filter(id => !allPageIds.includes(id)));
    else onSelectChange?.([...new Set([...selectedIds, ...allPageIds])]);
  };
  const toggleRow = (id) => {
    const sid = String(id);
    if (selectedIds.includes(sid)) onSelectChange?.(selectedIds.filter(x => x !== sid));
    else onSelectChange?.([...selectedIds, sid]);
  };

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 4 }}>
        <table className="table-base" style={{ minWidth: 600 }}>
          <thead style={{ background: 'var(--content-bg)', position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              {selectable && (
                <th style={{ width: 36, paddingLeft: 12 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortKey && handleSort(col.sortKey)}
                  style={{
                    cursor: col.sortKey ? 'pointer' : 'default',
                    userSelect: 'none',
                    width: col.width,
                    textAlign: col.align ?? 'left',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    {col.sortKey && sortKey === col.sortKey && (
                      sortDir === 'asc' ? <IconChevronUp size={11} /> : <IconChevronDown size={11} />
                    )}
                    {col.sortKey && sortKey !== col.sortKey && (
                      <span style={{ opacity: 0.3 }}><IconChevronUp size={11} /></span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {selectable && <td />}
                  {columns.map(col => (
                    <td key={col.key}>
                      <span style={{
                        display: 'inline-block', height: 12, borderRadius: 3,
                        width: '70%', background: 'var(--border)', opacity: 0.5,
                        animation: 'pulse-opacity 1.4s ease infinite',
                        animationDelay: `${i * 0.06}s`,
                      }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : processed.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : processed.map((row, i) => {
              const rid = String(row[rowKey] ?? i);
              const isSelected = selectedIds.includes(rid);
              return (
                <tr key={rid} style={{ background: isSelected ? 'rgba(0,122,255,0.08)' : undefined }}>
                  {selectable && (
                    <td style={{ paddingLeft: 12, width: 36 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(row[rowKey] ?? i)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} style={{ textAlign: col.align ?? 'left' }}>
                      {col.render ? col.render(row, i) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
