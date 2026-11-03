// Lokasi: src/components/Input.jsx
import React from 'react';

export default function Input({ label, id, className = '', ...props }) {
  return (
    <div className={`flex flex-col space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-forest-canopy">
          {label}
        </label>
      )}
      <input
        id={id}
        className="px-4 py-2.5 border border-sage-field rounded-lg bg-warm-limestone/30 text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-forest-canopy focus:border-transparent transition-all"
        {...props}
      />
    </div>
  );
}