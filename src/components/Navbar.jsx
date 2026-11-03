// Lokasi: src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Button from './Button';
import { Beef } from 'lucide-react'; // Ikon dari Lucide React

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-warm-limestone/90 backdrop-blur-md border-b border-pale-sage">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Beef className="text-forest-canopy w-8 h-8" />
            <span className="font-serif text-2xl text-forest-canopy font-bold">BobotSapi</span>
          </Link>

          {/* Menu Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#cara-kerja" className="text-deep-charcoal hover:text-forest-canopy font-medium transition-colors">Cara Kerja</a>
            <a href="#fitur" className="text-deep-charcoal hover:text-forest-canopy font-medium transition-colors">Fitur</a>
          </div>

          {/* Tombol Aksi */}
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:block">
              <Button variant="outline">Masuk</Button>
            </Link>
            <Link to="/register" className="hidden sm:block">
              <Button variant="primary">Daftar</Button>
            </Link>
          </div>

        </div>
      </div>
    </nav>
  );
}