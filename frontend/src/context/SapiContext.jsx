// Lokasi: src/context/SapiContext.jsx
import React, { createContext, useState, useContext } from 'react';

// Membuat "Brankas" data
const SapiContext = createContext();

// Provider adalah pengelola brankas yang akan membungkus aplikasi
export function SapiProvider({ children }) {
  // Data pusat awal (Mock Data Terintegrasi)
  const [dataSapi, setDataSapi] = useState([
    { 
      id: 'SAPI-001', 
      nama: 'Bima', 
      kelamin: 'Jantan', 
      bobotTerakhir: 450, 
      tanggalTerakhir: '2026-11-01', 
      riwayat: [{ tanggal: '2026-11-01', bobot: 450 }] 
    },
    { 
      id: 'SAPI-002', 
      nama: 'Srikandi', 
      kelamin: 'Betina', 
      bobotTerakhir: 380, 
      tanggalTerakhir: '2026-11-02', 
      riwayat: [{ tanggal: '2026-11-02', bobot: 380 }] 
    },
  ]);

  // Fungsi untuk menambah sapi baru beserta pengukuran pertamanya
  const tambahSapi = (sapiBaru) => {
    setDataSapi(prevData => [sapiBaru, ...prevData]);
  };

  // Fungsi untuk menambah pengukuran ke sapi yang sudah ada
  const tambahPengukuran = (idSapi, bobotBaru, tanggalBaru) => {
    setDataSapi(prevData => prevData.map(sapi => {
      if (sapi.id === idSapi) {
        return {
          ...sapi,
          bobotTerakhir: bobotBaru,
          tanggalTerakhir: tanggalBaru,
          riwayat: [{ tanggal: tanggalBaru, bobot: bobotBaru }, ...sapi.riwayat]
        };
      }
      return sapi;
    }));
  };

  // Fungsi untuk menghapus sapi
  const hapusSapi = (idSapi) => {
    setDataSapi(prevData => prevData.filter(sapi => sapi.id !== idSapi));
  };

  return (
    <SapiContext.Provider value={{ dataSapi, tambahSapi, tambahPengukuran, hapusSapi }}>
      {children}
    </SapiContext.Provider>
  );
}

// Hook kustom agar halaman lain mudah mengambil data dari brankas
export const useSapi = () => useContext(SapiContext);