// Lokasi: src/components/Button.jsx
import React from 'react';

export default function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) {
  // Base style: radius ~8px (rounded-lg), padding, dan transisi warna
  const baseStyle = "inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  
  // Pilihan varian warna tombol
  const variants = {
    primary: "bg-forest-canopy text-white hover:bg-deep-charcoal",
    outline: "border-2 border-forest-canopy text-forest-canopy hover:bg-pale-sage",
    danger: "bg-terracotta text-white hover:bg-red-800"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}