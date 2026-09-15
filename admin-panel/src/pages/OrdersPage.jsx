import { useEffect, useState, useCallback } from 'react';
import api from '../api.js';

const statusLabels = {
  pending: 'Kutilmoqda',
  delivered: 'Yetkazildi',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(() => {
    api
      .get('/orders')
      .then((res) => setOrders(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  async function handleStatusChange(orderId, status) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
    } catch (err) {
      console.error(err);
      loadOrders();
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Buyurtmalar</h1>
        <button className="btn-outline" onClick={loadOrders}>
          ↻ Yangilash
        </button>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Mijoz</th>
              <th>Telefon</th>
              <th>Mahsulotlar</th>
              <th>Jami summa</th>
              <th>Manzil</th>
              <th>Holat</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row">
                <td colSpan={7}>Yuklanmoqda...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={7}>Hozircha buyurtmalar yo'q</td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    {[order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') ||
                      "Noma'lum"}
                  </td>
                  <td>{order.user?.phone || '—'}</td>
                  <td className="order-items-cell">
                    {(order.items || []).map((i) => `${i.name} x${i.qty}`).join(', ')}
                  </td>
                  <td>
                    <b>{order.totalPrice.toLocaleString()} so'm</b>
                  </td>
                  <td>{order.location || '—'}</td>
                  <td>
                    <select
                      className="status-select"
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    >
                      <option value="pending">Kutilmoqda</option>
                      <option value="delivered">Yetkazildi</option>
                    </select>
                  </td>
                  <td>
                    {new Date(order.createdAt).toLocaleDateString('uz-UZ', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
