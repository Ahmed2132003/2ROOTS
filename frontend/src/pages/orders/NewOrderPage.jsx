import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCreateOrder } from '../../hooks/useOrders';
import './orders.css';

const INITIAL_FORM = {
  shipping_name: '',
  shipping_phone: '',
  shipping_address: '',
  variant_id: '',
  quantity: '1',
  tax: '0',
  shipping: '0',
  discount: '0',
  notes: '',
};

export default function NewOrderPage() {
  const navigate = useNavigate();
  const createOrder = useCreateOrder();
  const [form, setForm] = useState(INITIAL_FORM);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await createOrder.mutateAsync({
      shipping_name: form.shipping_name.trim(),
      shipping_phone: form.shipping_phone.trim(),
      shipping_address: form.shipping_address.trim(),
      status: 'pending',
      notes: form.notes.trim(),
      tax: Number(form.tax || 0),
      shipping: Number(form.shipping || 0),
      discount: Number(form.discount || 0),
      items: [{ variant_id: Number(form.variant_id), quantity: Number(form.quantity || 1) }],
    });
    navigate('/dashboard/orders');
  };

  return (
    <section className="orders-page">
      <header className="orders-page__header">
        <div>
          <h1 className="orders-page__title">New Order</h1>
          <p className="orders-page__subtitle">Create a new sales order directly from the dashboard interface.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/dashboard/orders" className="orders-btn">Cancel</Link>
        </div>
      </header>

      <form className="orders-surface orders-form" onSubmit={handleSubmit}>
        <div className="orders-form-grid">
          <label className="orders-field"><span>Customer Name</span><input className="orders-input" name="shipping_name" value={form.shipping_name} onChange={handleChange} required /></label>
          <label className="orders-field"><span>Customer Phone</span><input className="orders-input" name="shipping_phone" value={form.shipping_phone} onChange={handleChange} /></label>
          <label className="orders-field orders-field--full"><span>Shipping Address</span><input className="orders-input" name="shipping_address" value={form.shipping_address} onChange={handleChange} /></label>
          <label className="orders-field"><span>Variant ID</span><input className="orders-input" name="variant_id" type="number" min="1" value={form.variant_id} onChange={handleChange} required /></label>
          <label className="orders-field"><span>Quantity</span><input className="orders-input" name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange} required /></label>
          <label className="orders-field"><span>Tax</span><input className="orders-input" name="tax" type="number" min="0" step="0.01" value={form.tax} onChange={handleChange} /></label>
          <label className="orders-field"><span>Shipping</span><input className="orders-input" name="shipping" type="number" min="0" step="0.01" value={form.shipping} onChange={handleChange} /></label>
          <label className="orders-field"><span>Discount</span><input className="orders-input" name="discount" type="number" min="0" step="0.01" value={form.discount} onChange={handleChange} /></label>
          <label className="orders-field orders-field--full"><span>Internal Notes</span><textarea className="orders-textarea" name="notes" value={form.notes} onChange={handleChange} rows={4} /></label>
        </div>

        <div className="orders-form-actions">
          <button type="submit" className="orders-btn orders-btn--primary" disabled={createOrder.isPending}>{createOrder.isPending ? 'Creating...' : 'Create Order'}</button>
          <Link to="/dashboard/orders" className="orders-btn">Back to orders</Link>
        </div>
      </form>
    </section>
  );
}