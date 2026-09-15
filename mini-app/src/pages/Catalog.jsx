import { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard.jsx';
import api from '../api.js';

export default function Catalog({ onSelectProduct }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Barchasi');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/categories')
      .then((res) => setCategories(['Barchasi', ...res.data]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const query = activeCategory === 'Barchasi' ? '' : `?category=${encodeURIComponent(activeCategory)}`;
    api
      .get(`/products${query}`)
      .then((res) => setProducts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeCategory]);

  return (
    <div>
      <div className="page-title">Katalog</div>

      <div className="category-scroll">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-chip ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-text">Yuklanmoqda...</div>
      ) : (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onSelect={onSelectProduct} />
          ))}
        </div>
      )}
    </div>
  );
}
