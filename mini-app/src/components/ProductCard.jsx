import { useCart } from '../context/CartContext.jsx';

export default function ProductCard({ product, onSelect }) {
  const { addItem } = useCart();

  function handleQuickAdd(e) {
    e.stopPropagation();
    addItem(product, 1);
  }

  return (
    <button className="product-card" onClick={() => onSelect(product)}>
      <img src={product.imageUrl} alt={product.name} />
      <div className="product-info">
        <div className="product-name">{product.name}</div>
        <div className="product-prices">
          {product.oldPrice ? (
            <span className="old-price">{product.oldPrice.toLocaleString()} so'm</span>
          ) : null}
          <span className="new-price">{product.newPrice.toLocaleString()} so'm</span>
        </div>
      </div>
      <span className="quick-add" onClick={handleQuickAdd}>
        +
      </span>
    </button>
  );
}
