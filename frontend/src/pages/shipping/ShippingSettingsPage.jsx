import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createShippingRegion,
  deleteShippingRegion,
  getShippingRegions,
  updateShippingRegion,
} from '../../services/shippingService';
import '../orders/orders.css';

function normalizeShippingRegions(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

export default function ShippingSettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', price: '' });
  const [editing, setEditing] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['shipping-regions'],
    queryFn: getShippingRegions,
  });

  const regions = normalizeShippingRegions(data);

  const addMut = useMutation({
    mutationFn: createShippingRegion,
    onSuccess: () => {
      setForm({ name: '', price: '' });
      qc.invalidateQueries({ queryKey: ['shipping-regions'] });
    },
  });

  const editMut = useMutation({
    mutationFn: ({ id, payload }) => updateShippingRegion(id, payload),
    onSuccess: () => {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['shipping-regions'] });
    },
  });

  const delMut = useMutation({
    mutationFn: deleteShippingRegion,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipping-regions'] }),
  });

  return (
    <section className="orders-page">
      <header className="orders-page__header">
        <div>
          <h1 className="orders-page__title">Shipping Management</h1>
          <p className="orders-page__subtitle">Configure shipping governorates and prices.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/dashboard" className="orders-btn">
            Back to dashboard
          </Link>
        </div>
      </header>

      <div className="orders-surface">
        <div className="orders-filters">
          <input
            className="orders-input"
            placeholder="Governorate name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            className="orders-input"
            type="number"
            min="0"
            step="0.01"
            placeholder="Shipping price"
            value={form.price}
            onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
          />
          <button
            className="orders-btn orders-btn--primary"
            onClick={() => addMut.mutate({ name: form.name.trim(), price: Number(form.price || 0) })}
            disabled={!form.name.trim() || form.price === ''}
          >
            Add Region
          </button>
        </div>
      </div>

      <div className="orders-surface">
        <table className="orders-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Governorate Name</th>
              <th>Shipping Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="4">Loading...</td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan="4">
                  Failed to load regions.{' '}
                  <button className="orders-btn" onClick={() => refetch()}>
                    Retry
                  </button>
                </td>
              </tr>
            ) : regions.length === 0 ? (
              <tr>
                <td colSpan="4">No shipping regions available.</td>
              </tr>
            ) : (
              regions.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>
                    {editing === r.id ? (
                      <input
                        className="orders-input"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      />
                    ) : (
                      r.name
                    )}
                  </td>
                  <td>
                    {editing === r.id ? (
                      <input
                        className="orders-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                      />
                    ) : (
                      `${Number(r.price).toLocaleString()} EGP`
                    )}
                  </td>
                  <td>
                    {editing === r.id ? (
                      <>
                        <button
                          className="orders-btn"
                          onClick={() =>
                            editMut.mutate({
                              id: r.id,
                              payload: { name: form.name.trim(), price: Number(form.price || 0) },
                            })
                          }
                        >
                          Save
                        </button>
                        <button className="orders-btn" onClick={() => setEditing(null)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="orders-btn"
                          onClick={() => {
                            setEditing(r.id);
                            setForm({ name: r.name, price: r.price });
                          }}
                        >
                          Edit
                        </button>
                        <button className="orders-btn" onClick={() => delMut.mutate(r.id)}>
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}