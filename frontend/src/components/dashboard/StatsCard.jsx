const ICONS = {
  sales: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  ),
  shipping: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7h11v10H3V7Zm11 3h3l4 3v4h-7v-7Z" />
      <path d="M7.5 17.5a1.5 1.5 0 1 0 0 .01m9 0a1.5 1.5 0 1 0 0 .01" />
    </svg>
  ),
  'net-revenue': (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 18h16M6 15l4-4 3 3 5-6" />
      <path d="M15 8h3v3" />
    </svg>
  ),
  orders: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4h10l2 4v12H5V8l2-4Z" />
      <path d="M9 10h6M9 14h6" />
    </svg>
  ),
  customers: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  ),
  products: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 8 4.5v11L12 22l-8-4.5v-11L12 2Z" />
      <path d="m12 2 8 4.5-8 4.5-8-4.5L12 2Zm0 9v11" />
    </svg>
  ),
};

const TREND_ARROW = { up: '↑', down: '↓', flat: '→' };

export default function StatsCard({ title, value, change, trend = 'up', icon }) {
  const hasChange = typeof change === 'number';
  const trendClass = trend === 'down' ? 'is-down' : trend === 'flat' ? 'is-flat' : 'is-up';

  return (
    <article className="stats-card" aria-label={title}>
      <div className="stats-card__header">
        <span className="stats-card__icon">{ICONS[icon]}</span>
        <p className="stats-card__title">{title}</p>
      </div>

      <h3 className="stats-card__value">{value}</h3>

      {hasChange && (
        <p className={`stats-card__change ${trendClass}`}>
          {TREND_ARROW[trend] || '↑'}{' '}
          {change > 0 ? '+' : ''}{change}% vs last month
        </p>
      )}
    </article>
  );
}