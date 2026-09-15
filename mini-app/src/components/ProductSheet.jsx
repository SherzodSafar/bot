import { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';

export default function ProductSheet({ product, onClose }) {
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();

  const ingredients = (product.description || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  function handleAdd() {
    addItem(product, qty);
    onClose();
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
        <img className="sheet-image" src={product.imageUrl} alt={product.name} />

        <div className="sheet-body">
          <div className="sheet-title">{product.name}</div>
          <div className="sheet-price-row">
            {product.oldPrice ? (
              <span className="old-price">{product.oldPrice.toLocaleString()} so'm</span>
            ) : null}
            <span className="new-price">{product.newPrice.toLocaleString()} so'm</span>
          </div>

          {ingredients.length > 0 && (
            <>
              <div className="sheet-section-label">Tarkibi</div>
              <ul className="ingredient-list">
                {ingredients.map((ing) => (
                  <li key={ing}>{ing}</li>
                ))}
              </ul>
            </>
          )}

          <div className="sheet-section-label">Soni</div>
          <div className="qty-row">
            <button className="qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))}>
              −
            </button>
            <span className="qty-value">{qty}</span>
            <button className="qty-btn" onClick={() => setQty((q) => q + 1)}>
              +
            </button>
          </div>
        </div>

        <div className="sheet-sticky">
          <button className="btn-primary" onClick={handleAdd}>
            Savatchaga qo'shish — {(product.newPrice * qty).toLocaleString()} so'm
          </button>
        </div>
      </div>
    </div>
  );
}
