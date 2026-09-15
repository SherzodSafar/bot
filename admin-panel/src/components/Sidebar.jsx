const navItems = [
  { key: 'orders', icon: '🧾', label: 'Buyurtmalar' },
  { key: 'products', icon: '🍕', label: 'Mahsulotlar' },
];

export default function Sidebar({ activePage, onChange }) {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        Pizza<span>Admin</span>
      </div>
      {navItems.map((item) => (
        <button
          key={item.key}
          className={`sidebar-nav-item ${activePage === item.key ? 'active' : ''}`}
          onClick={() => onChange(item.key)}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
