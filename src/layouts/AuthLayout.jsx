// Lokasi: src/layouts/AuthLayout.jsx
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, List, Camera, User, Beef } from 'lucide-react';

export default function AuthLayout() {
  const location = useLocation();
  
  // Daftar menu navigasi
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Beranda' },
    { path: '/sapi', icon: List, label: 'Sapi' },
    { path: '/ukur', icon: Camera, label: 'Ukur' },
    { path: '/akun', icon: User, label: 'Akun' },
  ];

  return (
    <div className="min-h-screen bg-warm-limestone flex flex-col md:flex-row">
      
      {/* SIDEBAR DESKTOP (Disembunyikan di Mobile) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-pale-sage flex-col h-screen sticky top-0">
        <div className="p-6 flex items-center gap-2 text-forest-canopy border-b border-pale-sage">
          <Beef size={28} />
          <span className="font-serif text-2xl font-bold">BobotSapi</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.includes(item.path);
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${
                  isActive ? 'bg-forest-canopy text-white' : 'text-sage-field hover:bg-pale-sage/50 hover:text-deep-charcoal'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto">
        <div className="p-4 pt-12 md:p-8 md:pt-10 max-w-5xl mx-auto">
          <Outlet /> 
        </div>
      </main>

      {/* BOTTOM NAVIGATION MOBILE (Disembunyikan di Desktop) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-pale-sage flex justify-around items-center h-16 px-2 z-50 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.includes(item.path);
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-forest-canopy' : 'text-sage-field'
              }`}
            >
              <Icon size={20} className={isActive ? 'fill-forest-canopy' : ''} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          )
        })}
      </nav>
      
    </div>
  );
}