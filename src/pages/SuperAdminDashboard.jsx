import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Building2, Plus, LogOut, CheckCircle2, PauseCircle, XCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import API from '../api/axios';

const STATUS_STYLES = {
  active: { label: 'Active', className: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  suspended: { label: 'Suspended', className: 'bg-yellow-100 text-yellow-700', icon: PauseCircle },
  pending: { label: 'Pending', className: 'bg-gray-100 text-gray-600', icon: PauseCircle },
  closed: { label: 'Closed', className: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [overview, setOverview] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [overviewRes, businessesRes] = await Promise.all([
        API.get('/superadmin/overview'),
        API.get('/superadmin/businesses'),
      ]);
      setOverview(overviewRes.data);
      setBusinesses(businessesRes.data.businesses || []);
    } catch (err) {
      console.error('Failed to load superadmin dashboard', err);
      toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleToggleStatus = async (business) => {
    const nextStatus = business.status === 'active' ? 'suspended' : 'active';
    setTogglingId(business._id);
    try {
      await API.patch(`/superadmin/businesses/${business._id}/status`, { status: nextStatus });
      toast.success(`${business.name} is now ${nextStatus}`);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="text-orange-500" size={22} />
          <h1 className="text-lg font-black">Platform admin</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:inline">{user?.fullName}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-red-500 transition-colors"
          >
            <LogOut size={15} /> Log out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total businesses" value={overview?.totalBusinesses} />
          <StatCard label="Active" value={overview?.active} accent="text-green-600" />
          <StatCard label="Suspended" value={overview?.suspended} accent="text-yellow-600" />
          <StatCard label="Trialing" value={overview?.trialing} accent="text-orange-500" />
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-black">Businesses</h2>
            <button
              onClick={() => navigate('/superadmin/onboard')}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              <Plus size={16} /> Onboard business
            </button>
          </div>

          {loading ? (
            <p className="text-center text-gray-400 py-12 text-sm">Loading…</p>
          ) : businesses.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No businesses yet — onboard the first one.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {businesses.map((b) => {
                const statusInfo = STATUS_STYLES[b.status] || STATUS_STYLES.pending;
                const StatusIcon = statusInfo.icon;
                return (
                  <div key={b._id} className="flex items-center justify-between px-6 py-4">
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{b.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {b.plan} plan · {b.subscriptionStatus}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${statusInfo.className}`}>
                        <StatusIcon size={13} /> {statusInfo.label}
                      </span>
                      {b.status !== 'closed' && (
                        <button
                          onClick={() => handleToggleStatus(b)}
                          disabled={togglingId === b._id}
                          className="text-xs font-bold text-gray-500 hover:text-orange-500 border border-gray-200 hover:border-orange-300 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                        >
                          {togglingId === b._id
                            ? 'Updating…'
                            : b.status === 'active'
                            ? 'Suspend'
                            : 'Activate'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, accent = 'text-gray-800' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-black mt-1 ${accent}`}>{value ?? '—'}</p>
    </div>
  );
}