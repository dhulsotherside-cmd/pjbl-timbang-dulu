// Lokasi: src/pages/LandingPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import { Camera, BrainCircuit, LineChart, ShieldAlert, CheckCircle2, Beef } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-warm-limestone selection:bg-sage-field selection:text-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80" 
            alt="Sapi di peternakan" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-forest-canopy/80 mix-blend-multiply"></div>
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center pt-16">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif text-white mb-6 leading-tight">
            Pantau Bobot Sapi, <br className="hidden md:block" /> Lebih Praktis dengan Teknologi.
          </h1>
          <p className="text-lg md:text-xl text-pale-sage mb-10 max-w-2xl font-medium">
            Estimasi bobot sapi melalui foto untuk membantu Anda memantau perkembangan ternak secara berkala.
          </p>
          <Link to="/login">
            <Button variant="primary" className="text-lg px-8 py-4">
              Mulai Sekarang
            </Button>
          </Link>
        </div>
      </section>

      {/* Bagian Cara Kerja */}
      <section id="cara-kerja" className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif text-forest-canopy mb-4">Bagaimana Cara Kerjanya?</h2>
          <p className="text-deep-charcoal max-w-2xl mx-auto text-lg">Proses pengukuran yang dirancang khusus agar praktis digunakan di lapangan oleh peternak.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-12">
          {/* Langkah 1 */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-pale-sage rounded-2xl flex items-center justify-center text-forest-canopy shadow-sm">
              <Camera size={40} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-deep-charcoal">1. Ambil Foto</h3>
            <p className="text-sage-field">Ambil foto sapi dari beberapa sudut untuk mendapatkan estimasi bobot yang lebih optimal.</p>
          </div>
          {/* Langkah 2 */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-pale-sage rounded-2xl flex items-center justify-center text-forest-canopy shadow-sm">
              <BrainCircuit size={40} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-deep-charcoal">2. Proses AI</h3>
            <p className="text-sage-field">Sistem Machine Learning kami akan menganalisis estimasi bobot dari proporsi tubuh sapi di foto.</p>
          </div>
          {/* Langkah 3 */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-pale-sage rounded-2xl flex items-center justify-center text-forest-canopy shadow-sm">
              <LineChart size={40} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-deep-charcoal">3. Pantau Hasil</h3>
            <p className="text-sage-field">Lihat hasil estimasi bobot dan pantau perkembangannya dari waktu ke waktu.</p>
          </div>
        </div>
      </section>

      {/* Bagian Fitur Utama */}
      <section id="fitur" className="py-24 px-4 bg-pale-sage/30">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-serif text-forest-canopy mb-8">Fitur yang Memudahkan Peternak</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <CheckCircle2 className="text-forest-canopy shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-deep-charcoal text-lg">Manajemen Data Sapi</h4>
                  <p className="text-sage-field">Simpan profil setiap sapi di peternakan Anda dengan ID unik secara otomatis.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="text-forest-canopy shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-deep-charcoal text-lg">Riwayat & Grafik Pertumbuhan</h4>
                  <p className="text-sage-field">Pantau tren kenaikan atau penurunan bobot melalui grafik visual yang mudah dibaca.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="text-forest-canopy shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-deep-charcoal text-lg">Desain Mobile-First</h4>
                  <p className="text-sage-field">Akses cepat dan ringan langsung dari smartphone Anda saat berada di kandang.</p>
                </div>
              </div>
            </div>
          </div>
          {/* Dekorasi Visual Fitur */}
          <div className="bg-forest-canopy p-8 md:p-12 rounded-3xl text-white shadow-xl relative overflow-hidden">
             <div className="absolute -top-10 -right-10 p-8 opacity-10">
               <Beef size={250} />
             </div>
             <h3 className="text-2xl md:text-3xl font-serif mb-4 relative z-10 leading-snug">
               Fokus pada pertumbuhan, bukan administrasi rumit.
             </h3>
             <p className="text-pale-sage relative z-10 text-lg">
               Kami menghapus fitur yang tidak perlu agar Anda bisa fokus pada hal yang paling penting: memantau bobot ternak Anda secara efisien.
             </p>
          </div>
        </div>
      </section>

      {/* Disclaimer & Final CTA */}
      <section className="py-24 px-4 max-w-4xl mx-auto text-center space-y-12">
        {/* Kotak Peringatan/Disclaimer */}
        <div className="bg-terracotta/10 border border-terracotta/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6 text-left shadow-sm">
          <div className="bg-terracotta text-white p-4 rounded-full shrink-0">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h4 className="font-bold text-deep-charcoal text-xl mb-2">Penting untuk Diketahui</h4>
            <p className="text-sage-field text-base leading-relaxed">
              Platform ini memberikan <strong>estimasi</strong> bobot berbasis Machine Learning untuk keperluan pemantauan rutin. Hasil estimasi <span className="font-bold text-terracotta">tidak ditujukan sebagai pengganti timbangan fisik resmi</span> untuk keperluan transaksi jual beli ternak.
            </p>
          </div>
        </div>
        
        <div className="pt-8">
          <h2 className="text-3xl md:text-4xl font-serif text-forest-canopy mb-8">Siap memodernisasi peternakan Anda?</h2>
          <Link to="/register">
            <Button variant="primary" className="text-lg px-10 py-4">
              Buat Akun Peternakan
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-pale-sage bg-white py-12 text-center text-sage-field">
        <div className="flex justify-center items-center gap-2 mb-4">
          <Beef className="text-forest-canopy w-8 h-8" />
          <span className="font-serif text-2xl text-forest-canopy font-bold">BobotSapi</span>
        </div>
        <p className="mb-2">&copy; 2026 BobotSapi. All rights reserved.</p>
        <p className="text-sm">Platform pemantauan bobot ternak secara efisien</p>
      </footer>
    </div>
  );
}