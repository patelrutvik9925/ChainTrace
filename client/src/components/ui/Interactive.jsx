import { useState } from 'react';
import { clsx } from 'clsx';

export function Tabs({ tabs, activeTab, onChange, className }) {
  return (
    <div className={clsx('flex border-b border-[var(--border-subtle)]', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'px-4 py-2.5 text-xs font-medium transition-colors relative whitespace-nowrap',
            activeTab === tab.id
              ? 'text-[var(--text-primary)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--accent-blue)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          )}
        >
          {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <span className={clsx('ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full', activeTab === tab.id ? 'bg-[var(--accent-blue-subtle)] text-[var(--accent-blue)]' : 'bg-[var(--bg-overlay)] text-[var(--text-muted)]')}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children, size = 'md', className }) {
  if (!isOpen) return null;
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={clsx('relative bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-xl w-full', sizes[size], className)}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg leading-none">×</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Tooltip({ children, content, position = 'top' }) {
  const [visible, setVisible] = useState(false);
  const pos = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };
  return (
    <div className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && content && (
        <div className={clsx('absolute z-50 px-2.5 py-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-overlay)] border border-[var(--border-default)] rounded shadow-lg whitespace-nowrap pointer-events-none', pos[position])}>
          {content}
        </div>
      )}
    </div>
  );
}

export function Table({ columns, data, onRowClick, emptyText = 'No data.', className }) {
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--border-subtle)]">
            {columns.map((col) => (
              <th key={col.key} className={clsx('px-3 py-2.5 text-left text-[var(--text-muted)] font-medium uppercase tracking-wider whitespace-nowrap', col.headerClass)}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-[var(--text-muted)]">{emptyText}</td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row._id || row.id || i}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  'border-b border-[var(--border-subtle)] last:border-0 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-[var(--bg-elevated)]'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={clsx('px-3 py-2.5 text-[var(--text-primary)]', col.cellClass)}>
                    {col.render ? col.render(row[col.key], row) : row[col.key] || '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
