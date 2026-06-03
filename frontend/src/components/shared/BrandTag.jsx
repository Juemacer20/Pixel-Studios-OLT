import React from 'react';

/**
 * Brand → badge colour mapping.
 * Nokia intentionally uses badge-blue (closest to cyan in the shared design system).
 */
const BRAND_STYLES = {
  huawei:   { badgeClass: 'badge-orange', label: 'Huawei' },
  kingtype: { badgeClass: 'badge-blue',   label: 'KingType' },
  vsol:     { badgeClass: 'badge-purple', label: 'VSOL' },
  zte:      { badgeClass: 'badge-green',  label: 'ZTE' },
  nokia:    { badgeClass: 'badge-blue',   label: 'Nokia' },
};

/**
 * BrandTag — small rounded brand pill.
 *
 * @param {string} brand - vendor name (case-insensitive)
 */
export default function BrandTag({ brand }) {
  if (!brand) return null;

  const key = brand.toLowerCase().replace(/\s+/g, '');
  const cfg = BRAND_STYLES[key] || { badgeClass: 'badge-gray', label: brand };

  return (
    <span
      className={`badge ${cfg.badgeClass}`}
      style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10 }}
    >
      {cfg.label}
    </span>
  );
}
