import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import StatusBadge from './StatusBadge';
import { ORDER_STATUSES } from '../../hooks/useOrders';
import { formatDate, formatMoney } from './orderUtils';

/* ─── Skeleton ──────────────────────────────────────────────── */
function OrdersTableSkeleton() {
  return (
    <div className="orders-skeleton" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <Motion.div
          key={i}
          className="orders-skeleton-row"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
          style={{ height: '52px' }}
        />
      ))}
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────────── */
export default function OrdersTable({ orders, loading, onDelete, onUpdateStatus, onAddNote, activeAction }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const [expandedRowId, setExpandedRowId] = useState(null);
  const [noteValue, setNoteValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const openNoteEditor = (order) => {
    setExpandedRowId((cur) => (cur === order.id ? null : order.id));
    setNoteValue('');
  };

  if (loading) return <OrdersTableSkeleton />;

  if (!orders.length)
    return (
      <div className="orders-empty">
        {tr('No orders found. Adjust the filters or search term.', 'لا توجد طلبات. عدّل الفلاتر أو مصطلح البحث.')}
      </div>
    );

  return (
    <div className="orders-table-wrap">
      <table className="orders-table">
        <thead>
          <tr>
            <th>{tr('Order ID', 'رقم الطلب')}</th>
            <th>{tr('Customer', 'العميل')}</th>
            <th>{tr('Total', 'الإجمالي')}</th>
            <th>{tr('Status', 'الحالة')}</th>
            <th>{tr('Created', 'التاريخ')}</th>
            <th>{tr('Actions', 'الإجراءات')}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const busy = activeAction?.orderId === order.id;
            const isNoteOpen = expandedRowId === order.id;
            const isDeleteConfirming = confirmDeleteId === order.id;

            return (
              <Fragment key={order.id}>
                {/* ── Main row ── */}
                <tr>
                  <td>
                    <strong style={{ color: 'var(--text-primary)', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '1px', fontSize: '1rem' }}>
                      #{order.id}
                    </strong>
                  </td>

                  <td style={{ color: 'var(--text-primary)' }}>{order.customerName}</td>

                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatMoney(order.totalPrice)}
                  </td>

                  <td><StatusBadge status={order.status} /></td>

                  <td className="orders-muted" style={{ fontSize: '0.82rem' }}>
                    {formatDate(order.createdAt)}
                  </td>

                  <td>
                    <div className="orders-actions" role="group" aria-label={`Actions for order ${order.id}`}>
                      {/* View */}
                      <Link
                        to={`/dashboard/orders/${order.id}`}
                        className="orders-btn orders-btn--table orders-btn--secondary"
                      >
                        {tr('View', 'عرض')}
                      </Link>

                      {/* Status select */}
                      <select
                        className="orders-select orders-select--table"
                        value={order.status}
                        onChange={(e) => onUpdateStatus(order, e.target.value)}
                        aria-label={`Update status for order ${order.id}`}
                        disabled={busy}
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>

                      {/* Note toggle */}
                      <button
                        type="button"
                        className="orders-btn orders-btn--table orders-btn--secondary"
                        onClick={() => openNoteEditor(order)}
                        aria-label={`Add note to order ${order.id}`}
                        disabled={busy}
                      >
                        {activeAction?.type === 'note' && busy
                          ? tr('Saving…', 'جارٍ…')
                          : isNoteOpen
                          ? tr('Close', 'إغلاق')
                          : tr('Note', 'ملاحظة')}
                      </button>

                      {/* Delete / confirm */}
                      {isDeleteConfirming ? (
                        <div className="orders-inline-confirm">
                          <button
                            type="button"
                            className="orders-btn orders-btn--table orders-btn--danger"
                            onClick={() => onDelete(order)}
                            disabled={busy}
                          >
                            {activeAction?.type === 'delete' && busy
                              ? tr('Deleting…', 'جارٍ…')
                              : tr('Confirm', 'تأكيد')}
                          </button>
                          <button
                            type="button"
                            className="orders-btn orders-btn--table"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={busy}
                          >
                            {tr('Cancel', 'إلغاء')}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="orders-btn orders-btn--table orders-btn--danger"
                          onClick={() => setConfirmDeleteId(order.id)}
                          aria-label={`Delete order ${order.id}`}
                          disabled={busy}
                        >
                          {tr('Delete', 'حذف')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* ── Inline note panel ── */}
                <AnimatePresence>
                  {isNoteOpen && (
                    <tr className="orders-inline-row">
                      <td colSpan={6} style={{ padding: 0 }}>
                        <Motion.div
                          className="orders-inline-panel"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: 'hidden', padding: '12px' }}
                        >
                          <textarea
                            className="orders-input orders-textarea"
                            value={noteValue}
                            onChange={(e) => setNoteValue(e.target.value)}
                            rows={2}
                            placeholder={tr('Add admin note…', 'أضف ملاحظة إدارية…')}
                          />
                          <div className="orders-inline-panel__actions">
                            <button
                              type="button"
                              className="orders-btn orders-btn--table orders-btn--primary"
                              onClick={() => onAddNote(order, noteValue)}
                              disabled={busy || !noteValue.trim()}
                            >
                              {activeAction?.type === 'note' && busy
                                ? tr('Saving…', 'جارٍ الحفظ…')
                                : tr('Save Note', 'حفظ الملاحظة')}
                            </button>
                            <button
                              type="button"
                              className="orders-btn orders-btn--table"
                              onClick={() => setExpandedRowId(null)}
                              disabled={busy}
                            >
                              {tr('Cancel', 'إلغاء')}
                            </button>
                          </div>
                        </Motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}