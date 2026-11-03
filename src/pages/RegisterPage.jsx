// Lokasi: src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import { Eye, EyeOff, Beef } from 'lucide-react';

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex bg-warm-limestone">
      
<div className="hidden lg:flex lg:w-1/2 relative bg-forest-canopy">
        <img
          src="/sapi-register.jpg"
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
              Mulai digitalisasi <br/> peternakan Anda.
            </h2>
            <p className="text-pale-sage text-lg max-w-md">
              Satu akun untuk satu peternakan. Pantau bobot ternak dengan lebih cerdas dan praktis.
            </p>
          </div>
        </div>
      </div>

      {/* SISI KANAN: Form Register */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-pale-sage lg:border-none lg:shadow-none lg:bg-transparent lg:p-0 my-auto">
          
          <div className="text-center lg:text-left">
            <Link to="/" className="inline-flex lg:hidden items-center gap-2 text-forest-canopy mb-6">
              <Beef className="w-8 h-8" />
              <span className="font-serif text-2xl font-bold">BobotSapi</span>
            </Link>
            
            <h1 className="text-3xl font-bold text-deep-charcoal mb-2">Buat Akun</h1>
            <p className="text-sage-field">Lengkapi data peternakan Anda di bawah ini.</p>
          </div>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <Input
              label="Nama Peternakan"
              id="farmName"
              type="text"
              placeholder="Misal: Lembu Subur"
            />
            
            <Input
              label="Nama Admin"
              id="adminName"
              type="text"
              placeholder="Nama pengelola"
            />

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
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 bottom-2.5 text-sage-field hover:text-forest-canopy transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="pt-4">
              <Link to="/dashboard" className="block">
                <Button variant="primary" className="w-full py-3">
                  Daftar Sekarang
                </Button>
              </Link>
            </div>
          </form>

          <p className="text-center lg:text-left text-sage-field mt-4">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-forest-canopy font-bold hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}