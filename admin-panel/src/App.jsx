import { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';

export default function App() {
  const [activePage, setActivePage] = useState('orders');

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onChange={setActivePage} />
      <div className="main-content">
        {activePage === 'orders' && <OrdersPage />}
        {activePage === 'products' && <ProductsPage />}
      </div>
    </div>
  );
}
