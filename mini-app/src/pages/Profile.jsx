import { useEffect, useState } from 'react';
import api from '../api.js';
import { useCart } from '../context/CartContext.jsx';

const statusLabels = {
  pending: 'Kutilmoqda',
  delivered: 'Yetkazildi',
};

export default function Profile({ telegramUser, onGoCart }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    api
      .get('/orders/my')
      .then((res) => setOrders(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const firstName = telegramUser?.first_name || 'Mehmon';
  const fullName = [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(' ');

  function handleReorder(order) {
    (order.items || []).forEach((item) => {
      addItem(
        {
          id: item.productId,
          name: item.name,
          newPrice: item.price,
          imageUrl: item.imageUrl || '',
        },
        item.qty
      );
    });
    onGoCart();
  }

  return (
    <div>
      <div className="profile-header">
        <div className="profile-avatar">
          {telegramUser?.photo_url ? (
            <img src={telegramUser.photo_url} alt={firstName} />
          ) : (
            firstName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="profile-name">{fullName || firstName}</div>
      </div>

      <div className="order-history-title">📜 Mening buyurtmalarim</div>

      {loading ? (
        <div className="loading-text">Yuklanmoqda...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">📦</div>
          <div>Hali buyurtmalar yo'q</div>
        </div>
      ) : (
        orders.map((order) => (
          <div className="order-card" key={order.id}>
            <div className="order-card-top">
              <span className="order-date">
                {new Date(order.createdAt).toLocaleDateString('uz-UZ', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className={`order-status ${order.status}`}>
                {statusLabels[order.status] || order.status}
              </span>
            </div>
            <div className="order-items-text">
              {(order.items || []).map((i) => `${i.name} x${i.qty}`).join(', ')}
            </div>
            <div className="order-total">Jami: {order.totalPrice.toLocaleString()} so'm</div>
            <button className="reorder-btn" onClick={() => handleReorder(order)}>
              ↻ Yana shundan buyurtma qilish
            </button>
          </div>
        ))
      )}
    </div>
  );
}
