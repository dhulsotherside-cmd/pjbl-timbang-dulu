// Lokasi: src/pages/DashboardPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody } from '../components/Card';
import Button from '../components/Button';
import { Camera, PlusCircle, Activity, Box, Clock, CalendarDays, TrendingUp } from 'lucide-react';
import { useSapi } from '../context/SapiContext';

export default function DashboardPage() {
  const { dataSapi } = useSapi();

  // Hitung metrik dinamis
  const totalSapi = dataSapi.length;
  const totalPengukuran = dataSapi.reduce((total, sapi) => total + sapi.riwayat.length, 0);
  
  // Ambil maksimal 4 sapi terbaru
  const sapiTerbaru = [...dataSapi].slice(0, 4);

  // Menggabungkan semua riwayat pengukuran, mengurutkan dari yang terbaru, dan ambil 5 teratas
  const pengukuranTerbaru = dataSapi.flatMap(sapi => 
    sapi.riwayat.map(r => ({
      ...r,
      namaSapi: sapi.nama,
      idSapi: sapi.id
    }))
  )
  .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
  .slice(0, 5);

  // Format tanggal hari ini secara dinamis
  const tanggalHariIni = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* 1. HEADER BARU: Lebih ramai, bergradasi, dan informatif */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-gradient-to-r from-pale-sage/50 via-pale-sage/10 to-transparent p-6 sm:p-8 rounded-3xl border-l-8 border-forest-canopy shadow-sm">
        <div>
          <span className="text-xs font-bold text-forest-canopy uppercase tracking-widest mb-3 flex items-center gap-2">
            <Activity size={16} /> Ikhtisar Peternakan
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-deep-charcoal mb-2">Halo, Lembu Subur! 👋</h1>
          <p className="text-sage-field font-medium">Pantau terus perkembangan bobot ternak Anda hari ini.</p>
        </div>
        
        {/* Lencana Tanggal Dinamis */}
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl shadow-sm border border-pale-sage w-fit mt-2 md:mt-0">
          <CalendarDays size={20} className="text-forest-canopy" />
          <span className="text-sm font-bold text-deep-charcoal">{tanggalHariIni}</span>
        </div>
      </div>

      {/* 2. KARTU METRIK: Ditambah watermark background dan lencana tren */}
      <div className="grid grid-cols-2 gap-4 md:gap-6">
        <Card className="relative overflow-hidden border-pale-sage hover:border-forest-canopy transition-colors">
          {/* Ornamen Dekoratif (Watermark) */}
          <div className="absolute -right-6 -top-6 text-pale-sage/30 pointer-events-none">
            <Box size={120} strokeWidth={1} />
          </div>
          <CardBody className="flex flex-col items-center md:items-start text-center md:text-left relative z-10 p-6 md:p-8">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-forest-canopy mb-4 shadow-sm border border-pale-sage">
              <Box size={24} />
            </div>
            <p className="text-sage-field text-xs sm:text-sm font-bold uppercase tracking-wider mb-2">Total Sapi</p>
            <div className="flex items-end gap-3">
              <h3 className="text-4xl sm:text-5xl font-black text-deep-charcoal">{totalSapi}</h3>
              <span className="hidden sm:flex items-center text-xs font-bold text-forest-canopy bg-pale-sage/50 px-2 py-1 rounded-md mb-2">
                <TrendingUp size={12} className="mr-1" /> Aktif
              </span>
            </div>
          </CardBody>
        </Card>
        
        <Card className="relative overflow-hidden border-pale-sage hover:border-forest-canopy transition-colors">
          {/* Ornamen Dekoratif (Watermark) */}
          <div className="absolute -right-6 -top-6 text-pale-sage/30 pointer-events-none">
            <Activity size={120} strokeWidth={1} />
          </div>
          <CardBody className="flex flex-col items-center md:items-start text-center md:text-left relative z-10 p-6 md:p-8">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-forest-canopy mb-4 shadow-sm border border-pale-sage">
              <Activity size={24} />
            </div>
            <p className="text-sage-field text-xs sm:text-sm font-bold uppercase tracking-wider mb-2">Total Pengukuran</p>
            <div className="flex items-end gap-3">
              <h3 className="text-4xl sm:text-5xl font-black text-deep-charcoal">{totalPengukuran}</h3>
              <span className="hidden sm:flex items-center text-xs font-bold text-forest-canopy bg-pale-sage/50 px-2 py-1 rounded-md mb-2">
                <TrendingUp size={12} className="mr-1" /> Terdata
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tombol Aksi Utama */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/ukur">
          <Button variant="primary" className="w-full py-4 text-lg flex gap-2 shadow-md hover:shadow-lg transition-shadow">
            <Camera size={24} /> Ukur Bobot Sapi
          </Button>
        </Link>
        <Link to="/ukur/baru">
          <Button variant="outline" className="w-full py-4 text-lg flex gap-2 bg-white hover:bg-pale-sage/20 border-2">
            <PlusCircle size={24} /> Tambah Sapi Baru
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6 pt-2">
        {/* Kolom Kiri: Sapi Terbaru */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-deep-charcoal">Sapi Terbaru Terdaftar</h3>
            <Link to="/sapi" className="text-sm font-bold text-forest-canopy hover:underline">Lihat Semua</Link>
          </div>
          <div className="space-y-3">
            {sapiTerbaru.length > 0 ? (
              sapiTerbaru.map(sapi => (
                <Link to={`/sapi/${sapi.id}`} key={sapi.id}>
                  <Card className="hover:border-forest-canopy hover:shadow-sm transition-all">
                    <CardBody className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-deep-charcoal text-lg">{sapi.nama}</p>
                        <p className="text-xs font-medium text-sage-field mt-0.5">{sapi.id} • {sapi.kelamin}</p>
                      </div>
                      <div className="text-right bg-warm-limestone/50 px-3 py-1.5 rounded-lg border border-pale-sage/50">
                        <p className="font-bold text-forest-canopy">{sapi.bobotTerakhir} kg</p>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))
            ) : (
              <Card><CardBody className="text-center py-6 text-sage-field bg-white/50 border border-dashed rounded-xl">Belum ada data sapi.</CardBody></Card>
            )}
          </div>
        </div>
        
        {/* Kolom Kanan: Pengukuran Terbaru */}
        <div>
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-bold text-deep-charcoal">Riwayat Pengukuran</h3>
           </div>
           <div className="space-y-3">
              {pengukuranTerbaru.length > 0 ? (
                pengukuranTerbaru.map((ukur, index) => (
                  <Link to={`/sapi/${ukur.idSapi}`} key={index}>
                    <Card className="hover:border-forest-canopy hover:shadow-sm transition-all">
                      <CardBody className="p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="bg-pale-sage/30 p-2.5 rounded-xl text-forest-canopy border border-pale-sage hidden sm:block">
                            <Clock size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-deep-charcoal text-lg">{ukur.namaSapi}</p>
                            <p className="text-xs font-medium text-sage-field mt-0.5">{ukur.tanggal}</p>
                          </div>
                        </div>
                        <div className="text-right bg-warm-limestone/50 px-3 py-1.5 rounded-lg border border-pale-sage/50">
                          <p className="font-black text-forest-canopy">{ukur.bobot} kg</p>
                        </div>
                      </CardBody>
                    </Card>
                  </Link>
                ))
              ) : (
                <Card><CardBody className="text-center py-6 text-sage-field bg-white/50 border border-dashed rounded-xl">Belum ada data pengukuran.</CardBody></Card>
              )}
           </div>
        </div>
      </div>

    </div>
  );
}