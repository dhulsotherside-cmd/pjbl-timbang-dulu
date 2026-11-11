// Lokasi: src/App.jsx
import { Outlet } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen bg-warm-limestone text-deep-charcoal flex flex-col">
      {/* Konten Halaman sesuai Router akan muncul di sini */}
      <main className="flex-1 flex flex-col">
        <Outlet /> 
      </main>
    </div>
  )
}

export default App