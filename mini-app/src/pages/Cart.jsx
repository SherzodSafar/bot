import { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import api from '../api.js';
import { closeMiniApp, showAlert } from '../telegram.js';

const COLA = {
  id: 'cola',
  name: 'Kola 0.5L',
  newPrice: 5000,
  imageUrl:
    'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=200&q=80',
};

export default function Cart({ onGoCatalog }) {
  const { items, updateQty, removeItem, hasItem, addItem, total, clearCart } = useCart();
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const colaAdded = hasItem('cola');

  function toggleCola() {
    if (colaAdded) {
      removeItem('cola');
    } else {
      addItem(COLA, 1);
    }
  }

  async function handleConfirm() {
    if (!location.trim()) {
      showAlert('Iltimos, yetkazish manzilini kiriting');
      return;
    }
    if (!phone.trim()) {
      showAlert('Iltimos, telefon raqamingizni kiriting');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/orders', {
        items: items.map((i) => ({
          productId: i.id,
          name: i.name,
          price: i.price,
          qty: i.qty,
        })),
        totalPrice: total,
        location,
        phone,
      });
      clearCart();
      closeMiniApp();
    } catch (err) {
      showAlert("Buyurtma yuborishda xatolik yuz berdi. Qayta urinib ko'ring.");
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div>
        <div className="page-title">Savatcha</div>
        <div className="empty-state">
          <div className="empty-emoji">🛒</div>
          <div>Savatchangiz hali bo'sh</div>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={onGoCatalog}>
            Katalogga o'tish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">Savatcha</div>

      <div>
        {items.map((item) => (
          <div className="cart-item" key={item.id}>
            <img src={item.imageUrl} alt={item.name} />
            <div className="cart-item-info">
              <div className="cart-item-name">{item.name}</div>
              <div className="cart-item-price">{item.price.toLocaleString()} so'm</div>
              <div className="remove-btn" onClick={() => removeItem(item.id)}>
                O'chirish
              </div>
            </div>
            <div className="cart-qty">
              <button className="qty-btn" onClick={() => updateQty(item.id, item.qty - 1)}>
                −
              </button>
              <span className="qty-value">{item.qty}</span>
              <button className="qty-btn" onClick={() => updateQty(item.id, item.qty + 1)}>
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="upsell-card">
        <div className="upsell-emoji">🥤</div>
        <div className="upsell-text">
          Bunga qo'shimcha ravishda <b>Kola</b>ni atigi <b>5,000 so'm</b>ga qo'shasizmi?
        </div>
        <div className={`switch ${colaAdded ? 'on' : ''}`} onClick={toggleCola}>
          <div className="switch-knob" />
        </div>
      </div>

      <div className="field-group">
        <label className="field-label">Yetkazish manzili</label>
        <input
          className="field-input"
          placeholder="Ko'cha, uy raqami..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <div className="field-group">
        <label className="field-label">Telefon raqamingiz</label>
        <input
          className="field-input"
          placeholder="+998 90 123 45 67"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="cart-summary">
        <div className="summary-row">
          <span>Jami:</span>
          <span>{total.toLocaleString()} so'm</span>
        </div>
      </div>

      <div className="sticky-cta">
        <button className="btn-primary" disabled={submitting} onClick={handleConfirm}>
          {submitting ? 'Yuborilmoqda...' : 'Buyurtmani tasdiqlash'}
        </button>
      </div>
    </div>
  );
}
