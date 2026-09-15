import { useCart } from '../context/CartContext.jsx';

const tabs = [
  { key: 'home', icon: '🏠', label: 'Bosh sahifa' },
  { key: 'catalog', icon: '🔍', label: 'Katalog' },
  { key: 'cart', icon: '🛒', label: 'Savatcha' },
  { key: 'profile', icon: '👤', label: 'Profil' },
];

export default function BottomNav({ activeTab, onChange }) {
  const { count } = useCart();

  return (
    <div className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`nav-item ${activeTab === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          <span className="nav-icon">
            {tab.icon}
            {tab.key === 'cart' && count > 0 && <span className="nav-badge">{count}</span>}
          </span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
