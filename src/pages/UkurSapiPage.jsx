// Lokasi: src/pages/UkurSapiPage.jsx
import React, { useState, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card, CardBody } from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { Upload, Camera, CheckCircle2, ArrowRight, Loader2, ArrowLeft, Save, AlertCircle, ScanLine } from 'lucide-react';
import { useSapi } from '../context/SapiContext';

export default function UkurSapiPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dataSapi, tambahSapi, tambahPengukuran } = useSapi();
  
  const isInitialNew = location.pathname.includes('/baru');
  const [step, setStep] = useState(1);
  const [tab, setTab] = useState(isInitialNew ? 'baru' : 'terdaftar');

  const [formData, setFormData] = useState({ idSapiTerdaftar: '', nama: '', kelamin: 'Jantan' });
  const [photos, setPhotos] = useState({ samping: null, depan: null, belakang: null });
  const [isEstimating, setIsEstimating] = useState(false);
  const [hasilEstimasi, setHasilEstimasi] = useState(null);

  const fileInputRefs = { samping: useRef(null), depan: useRef(null), belakang: useRef(null) };

  const handlePhotoUpload = (e, perspektif) => {
    const file = e.target.files[0];
    if (file) setPhotos(prev => ({ ...prev, [perspektif]: URL.createObjectURL(file) }));
  };

  const handleEstimasi = () => {
    if (!photos.samping) return alert('Foto dari sisi samping wajib diunggah!');
    setStep(3);
    setIsEstimating(true);
    setTimeout(() => {
      setIsEstimating(false);
      setHasilEstimasi(Math.floor(Math.random() * (600 - 300 + 1) + 300));
    }, 3000);
  };

  const handleSimpan = () => {
    const tanggalHariIni = new Date().toISOString().split('T')[0];
    
    if (tab === 'baru') {
      const newId = `SAPI-00${dataSapi.length + 1}`;
      tambahSapi({
        id: newId,
        nama: formData.nama,
        kelamin: formData.kelamin,
        bobotTerakhir: hasilEstimasi,
        tanggalTerakhir: tanggalHariIni,
        riwayat: [{ tanggal: tanggalHariIni, bobot: hasilEstimasi }]
      });
      navigate(`/sapi/${newId}`);
    } else {
      tambahPengukuran(formData.idSapiTerdaftar, hasilEstimasi, tanggalHariIni);
      navigate(`/sapi/${formData.idSapiTerdaftar}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* HEADER BARU: Desain Terintegrasi & Canggih */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-5 bg-gradient-to-r from-pale-sage/50 via-pale-sage/10 to-transparent p-6 sm:p-8 rounded-3xl border-l-8 border-forest-canopy shadow-sm">
        <Link to="/dashboard" className="p-3 bg-white hover:bg-pale-sage rounded-2xl text-forest-canopy shadow-sm border border-pale-sage transition-colors shrink-0 sm:mt-1 w-fit">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <span className="text-xs font-bold text-forest-canopy uppercase tracking-widest mb-3 flex items-center gap-2">
            <ScanLine size={16} /> Modul Pengukuran AI
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-deep-charcoal mb-2">Ukur Bobot Sapi</h1>
          <p className="text-sage-field font-medium">Estimasi bobot ternak secara instan menggunakan teknologi Machine Learning.</p>
        </div>
      </div>

      {/* INDIKATOR LANGKAH (STEPPER): Lebih Tegang & Jelas */}
      <div className="flex items-center justify-between relative px-4 md:px-12">
        <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-1.5 bg-warm-limestone -z-10 rounded-full"></div>
        <div 
          className="absolute left-10 top-1/2 -translate-y-1/2 h-1.5 bg-forest-canopy -z-10 transition-all duration-700 rounded-full" 
          style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : 'calc(100% - 5rem)' }}
        ></div>
        
        {[1, 2, 3].map((num) => (
          <div key={num} className="flex flex-col items-center gap-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg border-4 transition-colors duration-300 shadow-sm ${
              step >= num ? 'bg-forest-canopy text-white border-forest-canopy' : 'bg-white text-sage-field border-pale-sage'
            }`}>
              {step > num ? <CheckCircle2 size={24} /> : num}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider hidden sm:block ${step >= num ? 'text-forest-canopy' : 'text-sage-field'}`}>
              {num === 1 ? 'Data Sapi' : num === 2 ? 'Upload Foto' : 'Hasil AI'}
            </span>
          </div>
        ))}
      </div>

      <Card className="border-2 border-pale-sage shadow-md">
        <CardBody className="p-6 md:p-10">
          
          {/* ================= STEP 1 ================= */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-deep-charcoal text-center mb-8">Pilih Sapi yang Akan Diukur</h2>
              
              <div className="flex p-1.5 bg-warm-limestone/50 rounded-2xl mb-8 border-2 border-pale-sage shadow-inner">
                <button onClick={() => setTab('terdaftar')} className={`flex-1 py-3.5 text-sm font-bold rounded-xl transition-all ${tab === 'terdaftar' ? 'bg-white text-forest-canopy shadow-md' : 'text-sage-field hover:text-deep-charcoal'}`}>Sapi Terdaftar</button>
                <button onClick={() => setTab('baru')} className={`flex-1 py-3.5 text-sm font-bold rounded-xl transition-all ${tab === 'baru' ? 'bg-white text-forest-canopy shadow-md' : 'text-sage-field hover:text-deep-charcoal'}`}>Sapi Baru</button>
              </div>

              {tab === 'terdaftar' ? (
                <div className="space-y-4">
                  <label className="text-sm font-bold text-forest-canopy uppercase tracking-wider">Pilih dari Direktori</label>
                  <select 
                    className="w-full px-5 py-4 border-2 border-warm-limestone rounded-xl bg-warm-limestone/20 focus:outline-none focus:border-forest-canopy focus:ring-4 focus:ring-pale-sage/50 text-deep-charcoal font-bold cursor-pointer"
                    value={formData.idSapiTerdaftar}
                    onChange={(e) => setFormData({...formData, idSapiTerdaftar: e.target.value})}
                  >
                    <option value="">-- Pilih Sapi --</option>
                    {dataSapi.map(sapi => (
                      <option key={sapi.id} value={sapi.id}>{sapi.nama} ({sapi.id})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-6">
                  <Input 
                    label="Nama Sapi" 
                    placeholder="Masukkan nama panggilan sapi" 
                    value={formData.nama} 
                    onChange={(e) => setFormData({...formData, nama: e.target.value})} 
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-deep-charcoal">Jenis Kelamin</label>
                    <select 
                      className="w-full px-5 py-4 border-2 border-warm-limestone rounded-xl bg-warm-limestone/20 focus:outline-none focus:border-forest-canopy focus:ring-4 focus:ring-pale-sage/50 text-deep-charcoal font-bold cursor-pointer" 
                      value={formData.kelamin} 
                      onChange={(e) => setFormData({...formData, kelamin: e.target.value})}
                    >
                      <option value="Jantan">Jantan (Pejantan)</option>
                      <option value="Betina">Betina (Indukan)</option>
                    </select>
                  </div>
                  <div className="flex gap-3 items-center text-sm font-medium text-forest-canopy bg-pale-sage/30 p-4 rounded-xl border border-pale-sage">
                    <AlertCircle size={20} className="shrink-0" />
                    <p>Profil sapi baru akan dibuat otomatis setelah estimasi selesai disimpan.</p>
                  </div>
                </div>
              )}

              <div className="pt-8">
                <Button variant="primary" className="w-full flex gap-2 py-4 text-lg shadow-md" onClick={() => setStep(2)} disabled={tab === 'terdaftar' ? !formData.idSapiTerdaftar : !formData.nama}>
                  Lanjut ke Foto <ArrowRight size={20} />
                </Button>
              </div>
            </div>
          )}

          {/* ================= STEP 2 ================= */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl font-bold text-deep-charcoal text-center mb-2">Unggah Foto Sapi</h2>
              <p className="text-sage-field text-center font-medium mb-8">Pastikan seluruh badan sapi terlihat jelas, terang, dan tidak terpotong.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['samping', 'depan', 'belakang'].map((sisi) => (
                  <div key={sisi} className="space-y-3">
                    <label className="text-sm font-bold text-deep-charcoal flex justify-between items-center capitalize">
                      Sisi {sisi} 
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${sisi === 'samping' ? 'text-terracotta bg-terracotta/10 border border-terracotta/20' : 'text-sage-field bg-pale-sage/50 border border-pale-sage'}`}>
                        {sisi === 'samping' ? 'Wajib' : 'Opsional'}
                      </span>
                    </label>
                    <div 
                      onClick={() => fileInputRefs[sisi].current.click()} 
                      className={`h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group ${photos[sisi] ? 'border-forest-canopy p-0 shadow-sm' : 'border-sage-field bg-warm-limestone/20 hover:border-forest-canopy hover:bg-pale-sage/20'}`}
                    >
                      {photos[sisi] ? (
                        <>
                          <img src={photos[sisi]} alt={`Preview ${sisi}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white font-bold text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">Ganti Foto</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 text-sage-field group-hover:text-forest-canopy group-hover:scale-110 transition-all">
                            <Camera size={28} />
                          </div>
                          <span className="text-sm text-sage-field font-bold">Ketuk untuk foto</span>
                        </>
                      )}
                    </div>
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRefs[sisi]} onChange={(e) => handlePhotoUpload(e, sisi)} />
                  </div>
                ))}
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-4 pt-8">
                <Button variant="outline" onClick={() => setStep(1)} className="w-full sm:w-1/3 py-4 text-base font-bold bg-white">Kembali</Button>
                <Button variant="primary" className="w-full sm:w-2/3 flex gap-2 py-4 text-lg shadow-md" onClick={handleEstimasi} disabled={!photos.samping}>
                  <Upload size={22} /> Mulai Estimasi AI
                </Button>
              </div>
            </div>
          )}

          {/* ================= STEP 3 ================= */}
          {step === 3 && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              {isEstimating ? (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-pale-sage rounded-full animate-pulse absolute"></div>
                    <Loader2 className="w-24 h-24 text-forest-canopy animate-spin relative z-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-deep-charcoal mb-2">Model AI Sedang Menganalisis...</h3>
                    <p className="text-sage-field text-lg">Memproses proporsi matriks tubuh sapi dari foto.<br/>Mohon tunggu sebentar.</p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-8 max-w-lg mx-auto py-4">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-pale-sage text-forest-canopy rounded-full mb-2 shadow-inner">
                    <CheckCircle2 size={48} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-deep-charcoal mb-2">Estimasi Selesai!</h2>
                    <p className="text-sage-field text-lg">Hasil analisis Machine Learning berdasarkan foto.</p>
                  </div>
                  
                  <div className="bg-forest-canopy text-white rounded-3xl p-10 shadow-xl border-4 border-pale-sage/30 relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 text-white/10 pointer-events-none">
                      <ScanLine size={150} />
                    </div>
                    <p className="text-pale-sage text-sm font-black uppercase tracking-widest mb-3 relative z-10">Bobot Estimasi</p>
                    <h1 className="text-7xl font-black relative z-10">{hasilEstimasi} <span className="text-3xl font-medium text-pale-sage">kg</span></h1>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row gap-4 pt-4">
                    <Button variant="outline" onClick={() => setStep(2)} className="w-full sm:w-1/3 py-4 font-bold bg-white">Ulang Foto</Button>
                    <Button variant="primary" onClick={handleSimpan} className="w-full sm:w-2/3 flex gap-2 py-4 text-lg shadow-md">
                      <Save size={22} /> Simpan Pengukuran
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}