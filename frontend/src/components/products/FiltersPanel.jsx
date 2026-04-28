import { motion as Motion } from 'framer-motion';

const defaultFilters = {
  category: '',
  min_price: '',
  max_price: '',
  in_stock: false,
  search: '',
  ordering: '-created_at',
};

export default function FiltersPanel({ filters, setFilters, categories, isRTL, t }) {
  const categoryList = Array.isArray(categories)
    ? categories
    : Array.isArray(categories?.results)
      ? categories.results
      : [];

  const resetFilters = () => setFilters(defaultFilters);

  return (
    <aside className="rounded-2xl border border-white/10 bg-[#171a2c] p-5 shadow-lg shadow-black/10 md:sticky md:top-24">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">{t('products.filter')}</h3>
        <button
          type="button"
          onClick={resetFilters}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-indigo-400/50 hover:text-indigo-200"
        >
          {isRTL ? 'إعادة ضبط' : 'Reset'}
        </button>
      </div>

      <div className="space-y-6">
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t('home.categories')}
          </p>
          <div className="space-y-2">
            {[{ slug: '', name: isRTL ? 'الكل' : 'All' }, ...categoryList].map((cat) => (
              <Motion.button
                whileHover={{ x: isRTL ? -2 : 2 }}
                key={cat.slug || 'all'}
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, category: cat.slug }))}
                className={`w-full rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  filters.category === cat.slug
                    ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                    : 'border-white/10 bg-[#111324] text-slate-300 hover:border-indigo-400/60'
                }`}
              >
                {cat.name}
              </Motion.button>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t('products.price')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder={isRTL ? 'من' : 'Min'}
              value={filters.min_price}
              onChange={(event) => setFilters((prev) => ({ ...prev, min_price: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-[#111324] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
            />
            <input
              type="number"
              placeholder={isRTL ? 'إلى' : 'Max'}
              value={filters.max_price}
              onChange={(event) => setFilters((prev) => ({ ...prev, max_price: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-[#111324] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </section>

        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-[#111324] px-3 py-2.5">
          <span className="text-sm font-medium text-slate-200">{t('products.in_stock')}</span>
          <input
            type="checkbox"
            checked={filters.in_stock}
            onChange={() => setFilters((prev) => ({ ...prev, in_stock: !prev.in_stock }))}
            className="h-4 w-4 accent-indigo-500"
          />
        </label>
      </div>
    </aside>
  );
}