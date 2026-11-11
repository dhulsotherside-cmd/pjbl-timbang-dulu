// Lokasi: src/pages/DaftarSapiPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody } from '../components/Card';
import Button from '../components/Button';
import { Search, PlusCircle, Scale, Calendar, Info, Database, Filter } from 'lucide-react';
import { useSapi } from '../context/SapiContext';

export default function DaftarSapiPage() {
  const { dataSapi } = useSapi();
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('Semua');

  const filteredSapi = dataSapi.filter(sapi => {
    const matchNameOrId = sapi.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          sapi.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchGender = genderFilter === 'Semua' || sapi.kelamin === genderFilter;
    return matchNameOrId && matchGender;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER BARU: Bergradasi selaras dengan Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-pale-sage/50 via-pale-sage/10 to-transparent p-6 sm:p-8 rounded-3xl border-l-8 border-forest-canopy shadow-sm">
        <div>
          <span className="text-xs font-bold text-forest-canopy uppercase tracking-widest mb-3 flex items-center gap-2">
            <Database size={16} /> Direktori Ternak
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-deep-charcoal mb-2">Daftar Sapi</h1>
          <p className="text-sage-field font-medium">Kelola dan pantau seluruh populasi sapi di peternakan Anda.</p>
        </div>
        <Link to="/ukur/baru" className="w-full md:w-auto shrink-0">
          <Button variant="primary" className="w-full md:w-auto flex gap-2 justify-center shadow-md hover:shadow-lg transition-shadow py-3.5 px-6 text-base">
            <PlusCircle size={20} /> Tambah Sapi Baru
          </Button>
        </Link>
      </div>

      {/* AREA PENCARIAN & FILTER: Dibuat lebih tegas */}
      <div className="bg-white p-5 rounded-2xl border-2 border-pale-sage shadow-sm flex flex-col sm:flex-row gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-forest-canopy"></div>
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-sage-field" size={20} />
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau ID sapi (misal: SAPI-001)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-warm-limestone rounded-xl bg-warm-limestone/20 focus:outline-none focus:border-forest-canopy focus:ring-4 focus:ring-pale-sage/50 transition-all font-medium text-deep-charcoal placeholder:text-sage-field/70"
          />
        </div>
        <div className="relative sm:w-56 shrink-0">
          <Filter className="absolute left-4 top-3.5 text-sage-field" size={20} />
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-warm-limestone rounded-xl bg-warm-limestone/20 focus:outline-none focus:border-forest-canopy focus:ring-4 focus:ring-pale-sage/50 transition-all font-medium text-deep-charcoal appearance-none cursor-pointer"
          >
            <option value="Semua">Semua Kelamin</option>
            <option value="Jantan">Jantan (Pejantan)</option>
            <option value="Betina">Betina (Indukan)</option>
          </select>
        </div>
      </div>

      {/* GRID KARTU SAPI */}
      {filteredSapi.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSapi.map((sapi) => (
            <Link to={`/sapi/${sapi.id}`} key={sapi.id} className="group">
              <Card className="hover:border-forest-canopy hover:shadow-md transition-all h-full border-2 border-transparent hover:border-forest-canopy/50">
                <CardBody className="flex flex-col h-full justify-between p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-deep-charcoal group-hover:text-forest-canopy transition-colors mb-1">
                        {sapi.nama}
                      </h3>
                      <p className="text-sm font-bold text-sage-field tracking-wide">{sapi.id}</p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                      sapi.kelamin === 'Jantan' 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {sapi.kelamin}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-dashed border-pale-sage mt-auto">
                    <div className="bg-warm-limestone/30 p-3 rounded-xl border border-pale-sage/50">
                      <div className="flex items-center gap-1.5 text-sage-field mb-1">
                        <Scale size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">Bobot</span>
                      </div>
                      <p className="font-black text-lg text-forest-canopy">{sapi.bobotTerakhir} <span className="text-sm font-medium">kg</span></p>
                    </div>
                    <div className="bg-warm-limestone/30 p-3 rounded-xl border border-pale-sage/50">
                      <div className="flex items-center gap-1.5 text-sage-field mb-1">
                        <Calendar size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">Update</span>
                      </div>
                      <p className="font-bold text-deep-charcoal">{sapi.tanggalTerakhir}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border-2 border-dashed border-pale-sage p-16 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-pale-sage/30 rounded-full flex items-center justify-center mb-6">
            <Info size={40} className="text-forest-canopy" />
          </div>
          <h3 className="text-2xl font-bold text-deep-charcoal mb-3">Tidak ada data sapi</h3>
          <p className="text-sage-field max-w-md text-lg">
            Sapi yang Anda cari tidak ditemukan atau Anda belum menambahkan data sapi ke dalam sistem.
          </p>
        </div>
      )}
    </div>
  );
}