// Lokasi: src/pages/DetailSapiPage.jsx
import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardBody } from '../components/Card';
import Button from '../components/Button';
import { ArrowLeft, Edit3, Trash2, Camera, Scale, Calendar, AlertTriangle, Info } from 'lucide-react';
import { useSapi } from '../context/SapiContext';

export default function DetailSapiPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { dataSapi, hapusSapi } = useSapi();
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Cari sapi berdasarkan ID dari context
  const currentSapi = useMemo(() => dataSapi.find(s => s.id === id), [dataSapi, id]);

  const handleDelete = () => {
    hapusSapi(id);
    navigate('/sapi');
  };

  // Jika sapi dihapus atau ID tidak valid, tampilkan halaman 404 sederhana
  if (!currentSapi) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Info size={64} className="text-sage-field mb-4" />
        <h2 className="text-2xl font-bold text-deep-charcoal mb-2">Data Sapi Tidak Ditemukan</h2>
        <p className="text-sage-field mb-6">Sapi dengan ID {id} mungkin telah dihapus.</p>
        <Link to="/sapi"><Button variant="primary">Kembali ke Daftar</Button></Link>
      </div>
    );
  }

  // Balikkan riwayat untuk grafik (dari lama ke baru agar grafik bergerak ke kanan)
  const chartData = [...currentSapi.riwayat].reverse();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center gap-4">
        <Link to="/sapi" className="p-2 hover:bg-pale-sage rounded-full text-sage-field transition-colors"><ArrowLeft size={24} /></Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-deep-charcoal">{currentSapi.nama}</h1>
          <p className="text-sage-field">ID: {currentSapi.id} • {currentSapi.kelamin}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/ukur" state={{ idSapi: currentSapi.id }} className="flex-1 sm:flex-none">
          <Button variant="primary" className="w-full flex gap-2"><Camera size={20} /> Ukur Ulang</Button>
        </Link>
        <Button variant="outline" className="flex-1 sm:flex-none flex gap-2 bg-white"><Edit3 size={20} /> Edit Nama</Button>
        <Button variant="danger" className="flex-1 sm:flex-none flex gap-2" onClick={() => setShowDeleteModal(true)}><Trash2 size={20} /> Hapus</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-forest-canopy text-white border-none">
            <CardBody className="flex items-center justify-between">
              <div>
                <p className="text-pale-sage mb-1 flex items-center gap-2"><Scale size={18} /> Bobot Estimasi Terakhir</p>
                <h2 className="text-4xl md:text-5xl font-bold">{currentSapi.bobotTerakhir} <span className="text-xl font-normal text-pale-sage">kg</span></h2>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-pale-sage mb-1 flex items-center justify-end gap-2"><Calendar size={18} /> Tanggal Pengukuran</p>
                <p className="text-xl font-medium">{currentSapi.tanggalTerakhir}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-lg font-bold text-deep-charcoal mb-6">Grafik Perkembangan Bobot</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D8DDCE" />
                    <XAxis dataKey="tanggal" axisLine={false} tickLine={false} tick={{ fill: '#71816B', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71816B', fontSize: 12 }} domain={['dataMin - 20', 'dataMax + 20']} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="bobot" stroke="#263D32" strokeWidth={3} dot={{ fill: '#263D32', strokeWidth: 2, r: 4, stroke: '#fff' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardBody>
              <h3 className="text-lg font-bold text-deep-charcoal mb-4">Riwayat Pengukuran</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {currentSapi.riwayat.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 hover:bg-pale-sage/30 rounded-lg transition-colors border-b border-pale-sage/50 last:border-0">
                    <div>
                      <p className="font-bold text-deep-charcoal">{item.bobot} kg</p>
                      <p className="text-xs text-sage-field">{item.tanggal}</p>
                    </div>
                    {index === 0 && <span className="text-[10px] font-bold bg-forest-canopy/10 text-forest-canopy px-2 py-1 rounded-full">Terbaru</span>}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-charcoal/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-terracotta/10 text-terracotta flex items-center justify-center mb-4"><AlertTriangle size={24} /></div>
            <h3 className="text-xl font-bold text-deep-charcoal mb-2">Hapus Sapi Ini?</h3>
            <p className="text-sage-field mb-6 text-sm">Apakah Anda yakin ingin menghapus <strong>{currentSapi.nama}</strong>? Seluruh riwayat akan hilang permanen.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteModal(false)}>Batal</Button>
              <Button variant="danger" className="flex-1" onClick={handleDelete}>Ya, Hapus</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}