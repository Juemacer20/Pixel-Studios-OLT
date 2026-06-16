import React from 'react';
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from '@tabler/icons-react';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function Pagination({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}) {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, totalItems);
  const pages = buildPageList(page, totalPages);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 8, paddingTop: 8, fontSize: 12, color: 'var(--text-secondary)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Show</span>
        <select
          value={pageSize}
          onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
          className="input-base"
          style={{ width: 70, padding: '3px 6px', fontSize: 12 }}
        >
          {pageSizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span>entries</span>
      </div>

      <span style={{ color: 'var(--text-muted)' }}>
        {totalItems === 0 ? 'No entries' : `Showing ${from} to ${to} of ${totalItems} entries`}
      </span>

      <div style={{ display: 'flex', gap: 3 }}>
        <PageBtn onClick={() => onPageChange(1)}           disabled={page === 1}          title="First"><IconChevronsLeft size={13} /></PageBtn>
        <PageBtn onClick={() => onPageChange(page - 1)}    disabled={page === 1}          title="Previous"><IconChevronLeft size={13} /></PageBtn>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} style={{ padding: '3px 6px', color: 'var(--text-muted)' }}>…</span>
          ) : (
            <PageBtn key={p} onClick={() => onPageChange(p)} active={p === page}>{p}</PageBtn>
          )
        )}
        <PageBtn onClick={() => onPageChange(page + 1)}    disabled={page === totalPages} title="Next"><IconChevronRight size={13} /></PageBtn>
        <PageBtn onClick={() => onPageChange(totalPages)}   disabled={page === totalPages} title="Last"><IconChevronsRight size={13} /></PageBtn>
      </div>
    </div>
  );
}

function PageBtn({ onClick, disabled, active, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: '3px 7px', fontSize: 12, borderRadius: 3,
        border: '1px solid var(--border)',
        background: active ? 'var(--primary)' : 'var(--card-bg)',
        color: active ? '#fff' : 'var(--text-primary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'inline-flex', alignItems: 'center',
      }}
    >
      {children}
    </button>
  );
}

function buildPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}
