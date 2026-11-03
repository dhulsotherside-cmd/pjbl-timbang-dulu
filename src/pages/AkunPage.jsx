// Lokasi: src/pages/AkunPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody } from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { LogOut, Lock, Building, Info, Key, X, UserCog } from 'lucide-react';

export default function AkunPage() {
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* HEADER BARU: Selaras dengan Dashboard, Daftar Sapi, dan Ukur */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-pale-sage/50 via-pale-sage/10 to-transparent p-6 sm:p-8 rounded-3xl border-l-8 border-forest-canopy shadow-sm">
        <div>
          <span className="text-xs font-bold text-forest-canopy uppercase tracking-widest mb-3 flex items-center gap-2">
            <UserCog size={16} /> Manajemen Profil
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-deep-charcoal mb-2">Pengaturan Akun</h1>
          <p className="text-sage-field font-medium">Kelola informasi peternakan dan kredensial keamanan akses Anda.</p>
        </div>
      </div>

      <Card className="border-2 border-pale-sage shadow-md">
        <CardBody className="p-6 md:p-10 space-y-10">
          
          {/* Seksi Profil Peternakan */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-dashed border-pale-sage pb-4">
              <div className="bg-pale-sage/50 p-2.5 rounded-xl text-forest-canopy">
                <Building size={24} />
              </div>
              <h3 className="text-xl font-bold text-deep-charcoal">Profil Peternakan</h3>
            </div>
            
            <div className="grid gap-6">
              <Input label="Nama Peternakan" defaultValue="Lembu Subur" />
              <Input label="Nama Admin" defaultValue="Pengelola Utama" />
              <div className="space-y-2">
                <Input 
                  label="Email Akses" 
                  defaultValue="admin@peternakan.com" 
                  type="email" 
                  disabled 
                  className="opacity-70 cursor-not-allowed bg-warm-limestone/50"
                />
                <div className="flex gap-2 items-center text-sm font-medium text-sage-field bg-pale-sage/20 p-3 rounded-xl border border-pale-sage/50">
                  <Info size={16} className="shrink-0" />
                  <p>Email tidak dapat diubah karena digunakan sebagai ID unik akun.</p>
                </div>
              </div>
            </div>
            
            <div className="pt-2">
              <Button variant="primary" className="px-8 py-3.5 shadow-sm text-base">Simpan Perubahan Profil</Button>
            </div>
          </section>

          {/* Seksi Keamanan */}
          <section className="space-y-6 pt-4">
            <div className="flex items-center gap-3 border-b-2 border-dashed border-pale-sage pb-4">
              <div className="bg-pale-sage/50 p-2.5 rounded-xl text-forest-canopy">
                <Lock size={24} />
              </div>
              <h3 className="text-xl font-bold text-deep-charcoal">Keamanan Akun</h3>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-warm-limestone/30 p-5 rounded-2xl border-2 border-pale-sage/50 gap-4">
              <div>
                <p className="font-bold text-deep-charcoal text-lg mb-1">Password Akun</p>
                <p className="text-sm font-medium text-sage-field">Perbarui password secara berkala untuk menjaga keamanan data peternakan.</p>
              </div>
              <Button 
                variant="outline" 
                className="flex gap-2 bg-white border-2 hover:border-forest-canopy shadow-sm whitespace-nowrap px-6 py-3" 
                onClick={() => setShowPasswordModal(true)}
              >
                <Key size={18} /> Ubah Password
              </Button>
            </div>
          </section>
          
        </CardBody>
      </Card>

      {/* Seksi Logout */}
      <div className="pt-4">
        <Button 
          variant="danger" 
          className="w-full flex gap-3 justify-center py-4.5 text-lg font-bold shadow-md hover:shadow-lg transition-all rounded-2xl" 
          onClick={handleLogout}
        >
          <LogOut size={24} /> Keluar dari Aplikasi
        </Button>
      </div>

      {/* Modal Ubah Password */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-charcoal/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-pale-sage">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-deep-charcoal">Ubah Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-sage-field hover:text-terracotta transition-colors cursor-pointer bg-pale-sage/30 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-5 mb-8">
              <Input label="Password Lama" type="password" placeholder="••••••••" />
              <Input label="Password Baru" type="password" placeholder="••••••••" />
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 py-3 font-bold border-2" onClick={() => setShowPasswordModal(false)}>Batal</Button>
              <Button variant="primary" className="flex-1 py-3 font-bold shadow-md" onClick={() => {
                alert('Password berhasil diperbarui!');
                setShowPasswordModal(false);
              }}>Simpan</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}