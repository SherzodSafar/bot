import { useEffect, useState } from 'react';
import Onboarding from './pages/Onboarding.jsx';
import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import Cart from './pages/Cart.jsx';
import Profile from './pages/Profile.jsx';
import BottomNav from './components/BottomNav.jsx';
import ProductSheet from './components/ProductSheet.jsx';
import { initTelegram, getTelegramUser } from './telegram.js';
import api from './api.js';

export default function App() {
  const [onboardingDone, setOnboardingDone] = useState(
    () => localStorage.getItem('onboarding_done') === '1'
  );
  const [activeTab, setActiveTab] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [telegramUser, setTelegramUser] = useState(null);

  useEffect(() => {
    initTelegram();
    setTelegramUser(getTelegramUser());
    api.post('/register', {}).catch(() => {});
  }, []);

  function finishOnboarding() {
    localStorage.setItem('onboarding_done', '1');
    setOnboardingDone(true);
  }

  if (!onboardingDone) {
    return <Onboarding onFinish={finishOnboarding} />;
  }

  return (
    <div>
      {activeTab === 'home' && (
        <Home
          telegramUser={telegramUser}
          onGoCatalog={() => setActiveTab('catalog')}
          onSelectProduct={setSelectedProduct}
        />
      )}
      {activeTab === 'catalog' && <Catalog onSelectProduct={setSelectedProduct} />}
      {activeTab === 'cart' && <Cart onGoCatalog={() => setActiveTab('catalog')} />}
      {activeTab === 'profile' && (
        <Profile telegramUser={telegramUser} onGoCart={() => setActiveTab('cart')} />
      )}

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />

      {selectedProduct && (
        <ProductSheet product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
}
