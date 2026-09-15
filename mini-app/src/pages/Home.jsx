import { useEffect, useState } from 'react';
import StoryBlock from '../components/StoryBlock.jsx';
import ProductCard from '../components/ProductCard.jsx';
import api from '../api.js';

export default function Home({ telegramUser, onGoCatalog, onSelectProduct }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api
      .get('/products')
      .then((res) => setProducts(res.data.slice(0, 4)))
      .catch(() => {});
  }, []);

  const firstName = telegramUser?.first_name || 'Mehmon';

  return (
    <div>
      <div className="app-header">
        <div>
          <div className="greeting-title">Salom, {firstName} 👋</div>
          <div className="greeting-sub">Bugun nima yeymiz?</div>
        </div>
        <div className="avatar-circle">
          {telegramUser?.photo_url ? (
            <img src={telegramUser.photo_url} alt={firstName} />
          ) : (
            firstName.charAt(0).toUpperCase()
          )}
        </div>
      </div>

      <StoryBlock />

      <div className="hero-card" onClick={onGoCatalog}>
        <div className="hero-title">Yangi buyurtma berish</div>
        <div className="hero-sub">Eng mazali pizzalarni tanlang va tezkor yetkazib beramiz</div>
        <button className="hero-btn" onClick={onGoCatalog}>
          Katalogga o'tish →
        </button>
        <div className="hero-emoji">🍕</div>
      </div>

      <div className="section-title">Ommabop pizzalar</div>
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onSelect={onSelectProduct} />
        ))}
      </div>
    </div>
  );
}
