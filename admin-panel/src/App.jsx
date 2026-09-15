import { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import Login from './pages/Login.jsx';
import { getAdminKey, clearAdminKey } from './api.js';

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getAdminKey()));
  const [activePage, setActivePage] = useState('orders');

  function handleLogout() {
    clearAdminKey();
    setAuthed(false);
  }

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onChange={setActivePage} onLogout={handleLogout} />
      <div className="main-content">
        {activePage === 'orders' && <OrdersPage />}
        {activePage === 'products' && <ProductsPage />}
      </div>
    </div>
  );
}
