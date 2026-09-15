import { useEffect, useState, useCallback } from 'react';
import api from '../api.js';
import ProductFormModal from '../components/ProductFormModal.jsx';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const loadProducts = useCallback(() => {
    api
      .get('/products')
      .then((res) => setProducts(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function openCreateModal() {
    setEditingProduct(null);
    setModalOpen(true);
  }

  function openEditModal(product) {
    setEditingProduct(product);
    setModalOpen(true);
  }

  async function handleDelete(product) {
    if (!confirm(`"${product.name}" mahsulotini o'chirmoqchimisiz?`)) return;
    try {
      await api.delete(`/products/${product.id}`);
      loadProducts();
    } catch (err) {
      console.error(err);
      alert("O'chirishda xatolik yuz berdi");
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Mahsulotlar</h1>
        <button className="btn" onClick={openCreateModal}>
          + Yangi qo'shish
        </button>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Mahsulot</th>
              <th>Kategoriya</th>
              <th>Narx</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row">
                <td colSpan={4}>Yuklanmoqda...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={4}>Hozircha mahsulotlar yo'q</td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="product-name-cell">
                      <img className="product-thumb" src={product.imageUrl} alt={product.name} />
                      {product.name}
                    </div>
                  </td>
                  <td>{product.category}</td>
                  <td>
                    {product.oldPrice ? (
                      <span className="price-old">{product.oldPrice.toLocaleString()} so'm</span>
                    ) : null}
                    <span className="price-new">{product.newPrice.toLocaleString()} so'm</span>
                  </td>
                  <td>
                    <button className="icon-btn" title="Tahrirlash" onClick={() => openEditModal(product)}>
                      ✏️
                    </button>
                    <button
                      className="icon-btn danger"
                      title="O'chirish"
                      onClick={() => handleDelete(product)}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => setModalOpen(false)}
          onSaved={loadProducts}
        />
      )}
    </div>
  );
}
