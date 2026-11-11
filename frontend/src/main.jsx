// Lokasi: src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { SapiProvider } from './context/SapiContext.jsx';

// Impor Layout
import App from './App.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';

// Impor Halaman
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import DaftarSapiPage from './pages/DaftarSapiPage.jsx';
import DetailSapiPage from './pages/DetailSapiPage.jsx';
import UkurSapiPage from './pages/UkurSapiPage.jsx';
import AkunPage from './pages/AkunPage.jsx';

import './index.css';

const router = createBrowserRouter([
  {
    // Grup Rute Publik (Tanpa Sidebar)
    path: "/",
    element: <App />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ]
  },
  {
    // Grup Rute Privat (Dengan Sidebar / Bottom Nav)
    path: "/",
    element: <AuthLayout />,
    children: [
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/sapi", element: <DaftarSapiPage /> },
      { path: "/sapi/:id", element: <DetailSapiPage /> },
      { path: "/ukur", element: <UkurSapiPage /> },
      { path: "/ukur/baru", element: <UkurSapiPage /> },
      { path: "/akun", element: <AkunPage /> },
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SapiProvider>
      <RouterProvider router={router} />
    </SapiProvider>
  </React.StrictMode>,
)
