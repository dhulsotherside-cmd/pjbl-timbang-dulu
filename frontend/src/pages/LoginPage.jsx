// Lokasi: src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import { Eye, EyeOff, Beef } from 'lucide-react';

export default function LoginPage() {
  // State untuk mengingat status lihat/sembunyi password
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex bg-warm-limestone">
      
      {/* SISI KIRI: Foto Peternakan (Hanya Desktop) */}
      {/* "hidden lg:flex" artinya sembunyikan di HP, tampilkan di layar besar */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-forest-canopy">
        <img
          src="https://images.unsplash.com/photo-1596733430284-f7437764b1a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1080&q=80"
          alt="Sapi di peternakan"
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-70"
        />
        <div className="relative z-10 p-12 flex flex-col justify-between h-full w-full">
          <Link to="/" className="flex items-center gap-2 text-white w-fit hover:opacity-80 transition-opacity">
            <Beef className="w-8 h-8" />
            <span className="font-serif text-2xl font-bold">BobotSapi</span>
          </Link>
          <div>
            <h2 className="text-4xl lg:text-5xl font-serif text-white mb-4 leading-tight">
              Pantau perkembangan <br/> ternak lebih mudah.
            </h2>
            <p className="text-pale-sage text-lg max-w-md">
              Masuk ke akun peternakan Anda untuk melanjutkan estimasi bobot sapi.
            </p>
          </div>
        </div>
      </div>

      {/* SISI KANAN: Form Login (Mobile 1 Kolom, Desktop Setengah Layar) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        {/* Kotak pembungkus form */}
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-pale-sage lg:border-none lg:shadow-none lg:bg-transparent lg:p-0">
          
          {/* Header Form */}
          <div className="text-center lg:text-left">
            {/* Logo untuk Mobile (Disembunyikan di Desktop) */}
            <Link to="/" className="inline-flex lg:hidden items-center gap-2 text-forest-canopy mb-8">
              <Beef className="w-8 h-8" />
              <span className="font-serif text-2xl font-bold">BobotSapi</span>
            </Link>
            
            <h1 className="text-3xl font-bold text-deep-charcoal mb-2">Selamat Datang</h1>
            <p className="text-sage-field">Silakan masukkan email dan password Anda.</p>
          </div>

          {/* Form Login */}
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <Input
              label="Email"
              id="email"
              type="email"
              placeholder="admin@peternakan.com"
            />
            
            <div className="relative">
              <Input
                label="Password"
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
              />
              {/* Tombol Mata (Eye) diletakkan absolut di dalam div relative */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 bottom-2.5 text-sage-field hover:text-forest-canopy transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Tombol Masuk - Akan kita fungsikan ke Dashboard nanti */}
            <Link to="/dashboard" className="block pt-2">
              <Button variant="primary" className="w-full py-3">
                Masuk
              </Button>
            </Link>
          </form>

          <p className="text-center lg:text-left text-sage-field mt-6">
            Belum punya akun?{' '}
            {/* Link ini belum ada halamannya, akan kita buat di tahap selanjutnya */}
            <Link to="/register" className="text-forest-canopy font-bold hover:underline">
              Daftar di sini
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}