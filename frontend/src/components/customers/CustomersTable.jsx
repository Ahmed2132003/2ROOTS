import { Link } from 'react-router-dom';
import { formatDate, formatMoney } from '../orders/orderUtils';

function CustomersTableSkeleton() {
  return <div className="orders-skeleton" aria-hidden="true">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="orders-skeleton-row" />)}</div>;
}

export default function CustomersTable({ customers, loading }) {
  if (loading) return <CustomersTableSkeleton />;
  if (!customers.length) return <div className="orders-empty">No customers found. Adjust your search term.</div>;

  return (
    <div className="orders-table-wrap"><table className="orders-table"><thead><tr><th>Customer Name</th><th>Email</th><th>Phone</th><th>Address</th><th>Number of Orders</th><th>Total Spent</th><th>Created At</th><th>Actions</th></tr></thead><tbody>
      {customers.map((customer) => <tr key={customer.id}><td><strong>{customer.fullName}</strong></td><td>{customer.email || '-'}</td><td>{customer.phone || '-'}</td><td>{customer.address || '-'}</td><td>{customer.totalOrders}</td><td>{formatMoney(customer.totalSpent)}</td><td className="orders-muted">{formatDate(customer.createdAt)}</td><td><Link to={`/dashboard/customers/${customer.id}`} className="orders-link">View Details</Link></td></tr>)}      
    </tbody></table></div>
  );
}