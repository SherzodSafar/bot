import { useState } from 'react';
import api from '../api.js';

export default function ProductFormModal({ product, onClose, onSaved }) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    imageUrl: product?.imageUrl || '',
    oldPrice: product?.oldPrice || '',
    newPrice: product?.newPrice || '',
    category: product?.category || '',
  });
  const [saving, setSaving] = useState(false);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.imageUrl || !form.newPrice || !form.category) {
      alert("Iltimos, majburiy maydonlarni to'ldiring (nomi, rasm, narx, kategoriya)");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/products/${product.id}`, form);
      } else {
        await api.post('/products', form);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? 'Mahsulotni tahrirlash' : "Yangi mahsulot qo'shish"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nomi</label>
            <input
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Masalan: Margarita"
            />
          </div>

          <div className="form-group">
            <label>Ta'rifi (tarkibi, vergul bilan ajrating)</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Pomidor sousi, Mozarella, Bazalik"
            />
          </div>

          <div className="form-group">
            <label>Rasm URL</label>
            <input
              value={form.imageUrl}
              onChange={(e) => handleChange('imageUrl', e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Eski narx</label>
              <input
                type="number"
                value={form.oldPrice}
                onChange={(e) => handleChange('oldPrice', e.target.value)}
                placeholder="65000"
              />
            </div>
            <div className="form-group">
              <label>Yangi narx *</label>
              <input
                type="number"
                value={form.newPrice}
                onChange={(e) => handleChange('newPrice', e.target.value)}
                placeholder="49000"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Kategoriya</label>
            <input
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
              placeholder="Klassik"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose}>
              Bekor qilish
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
