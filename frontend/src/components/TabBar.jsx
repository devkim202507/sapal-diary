const tabs = [
  { id: 'trade', label: '입력' },
  { id: 'positions', label: '보유' },
  { id: 'analysis', label: '분석' },
];

export default function TabBar({ active, onChange }) {
  return (
    <nav className="flex border-t border-slate-800/80">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex-1 py-3 text-sm font-semibold ${
            active === t.id
              ? 'border-b-2 border-emerald-400 text-white'
              : 'text-slate-500'
          }`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
