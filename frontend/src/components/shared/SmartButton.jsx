import React from 'react';

const VARIANT_CLASS = {
  primary: 'btn btn-primary',
  success: 'btn btn-success',
  warning: 'btn btn-warning',
  danger:  'btn btn-danger',
  default: 'btn',
  link:    'btn btn-link',
};

const SIZE_STYLE = {
  sm: { padding: '2px 8px', fontSize: 11 },
  md: {},
  lg: { padding: '7px 16px', fontSize: 14 },
};

export default function SmartButton({
  variant = 'default',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  style = {},
  children,
}) {
  const cls = VARIANT_CLASS[variant] ?? 'btn';
  const sz  = SIZE_STYLE[size] ?? {};
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={`${cls} ${className}`}
      style={{ ...sz, ...(isDisabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}), ...style }}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
    >
      {loading ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="spinner" style={{ width: 12, height: 12 }} />
          {children}
        </span>
      ) : children}
    </button>
  );
}
