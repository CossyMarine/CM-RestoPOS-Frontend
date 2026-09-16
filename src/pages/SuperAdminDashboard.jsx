import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Building2, Plus, LogOut, CheckCircle2, PauseCircle, XCircle,
  ChevronDown, ChevronUp, Smartphone, Receipt as ReceiptIcon,
} from 'lucide-react';
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
  const [expandedId, setExpandedId] = useState(null);

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
                const isExpanded = expandedId === b._id;
                return (
                  <div key={b._id}>
                    <div className="flex items-center justify-between px-6 py-4">
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{b.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {b.plan} plan · {b.subscriptionStatus}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
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
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : b._id)}
                          className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-orange-500 border border-gray-200 hover:border-orange-300 rounded-lg px-3 py-1.5 transition-colors"
                        >
                          Manage {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>
                    {isExpanded && <BusinessConfigPanel businessId={b._id} />}
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

// ---- Per-business config panel: M-Pesa + eTIMS status and inline setup ----

function BusinessConfigPanel({ businessId }) {
  const [mpesaConfig, setMpesaConfig] = useState(undefined); // undefined = loading
  const [etimsConfig, setEtimsConfig] = useState(undefined);

  const loadConfigs = useCallback(async () => {
    try {
      const [mpesaRes, etimsRes] = await Promise.all([
        API.get(`/superadmin/businesses/${businessId}/payment-config`),
        API.get(`/superadmin/businesses/${businessId}/etims-config`),
      ]);
      setMpesaConfig(mpesaRes.data.config);
      setEtimsConfig(etimsRes.data.config);
    } catch (err) {
      toast.error('Failed to load configuration status');
    }
  }, [businessId]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  return (
    <div className="bg-gray-50 border-t border-gray-100 px-6 py-5 grid sm:grid-cols-2 gap-4">
      <MpesaConfigCard businessId={businessId} config={mpesaConfig} onSaved={loadConfigs} />
      <EtimsConfigCard businessId={businessId} config={etimsConfig} onSaved={loadConfigs} />
    </div>
  );
}

function ConfigStatusBadge({ enabled }) {
  return enabled ? (
    <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
      <CheckCircle2 size={12} /> Enabled
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
      <PauseCircle size={12} /> {`Not configured`}
    </span>
  );
}

function MpesaConfigCard({ businessId, config, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    shortcode: '', shortcodeType: 'till', consumerKey: '', consumerSecret: '', passkey: '',
    environment: 'sandbox', enabled: true,
  });

  useEffect(() => {
    if (config) {
      setForm((f) => ({
        ...f,
        shortcode: config.shortcode || '',
        shortcodeType: config.shortcodeType || 'till',
        environment: config.environment || 'sandbox',
        enabled: !!config.enabled,
      }));
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Only include secret fields if the user actually typed something —
      // an empty string would encrypt to null and silently overwrite the
      // real saved secret. Non-secret fields are always safe to send as-is.
      const payload = {
        shortcode: form.shortcode,
        shortcodeType: form.shortcodeType,
        environment: form.environment,
        enabled: form.enabled,
        ...(form.consumerKey && { consumerKey: form.consumerKey }),
        ...(form.consumerSecret && { consumerSecret: form.consumerSecret }),
        ...(form.passkey && { passkey: form.passkey }),
      };

      await API.patch(`/superadmin/businesses/${businessId}/payment-config`, payload);
      toast.success('M-Pesa configuration saved');
      setEditing(false);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save M-Pesa config');
    } finally {
      setSaving(false);
    }
  };

  if (config === undefined) return <div className="bg-white rounded-xl p-4 border border-gray-200 text-xs text-gray-400">Loading…</div>;

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Smartphone size={15} className="text-green-600" />
          <span className="text-sm font-bold">M-Pesa</span>
        </div>
        <ConfigStatusBadge enabled={config?.enabled} />
      </div>

      {!editing ? (
        <>
          {config ? (
            <p className="text-xs text-gray-500">
              Shortcode: <span className="font-semibold text-gray-700">{config.shortcode}</span>
              {' '}({config.shortcodeType || 'till'}) · {config.environment}
            </p>
          ) : (
            <p className="text-xs text-gray-400">No M-Pesa credentials on file.</p>
          )}
          <button
            onClick={() => setEditing(true)}
            className="mt-3 text-xs font-bold text-orange-500 hover:text-orange-600"
          >
            {config ? 'Update credentials' : 'Set up M-Pesa'}
          </button>
        </>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input placeholder="Shortcode" autoComplete="off" value={form.shortcode}
              onChange={(e) => setForm({ ...form, shortcode: e.target.value })}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5" />
            <select value={form.shortcodeType} onChange={(e) => setForm({ ...form, shortcodeType: e.target.value })}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5">
              <option value="till">Till (Buy Goods)</option>
              <option value="paybill">Paybill</option>
            </select>
          </div>
          <input placeholder="Consumer Key" type="password" autoComplete="new-password" value={form.consumerKey}
            onChange={(e) => setForm({ ...form, consumerKey: e.target.value })}
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5" />
          <input placeholder="Consumer Secret" type="password" autoComplete="new-password" value={form.consumerSecret}
            onChange={(e) => setForm({ ...form, consumerSecret: e.target.value })}
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5" />
          <input placeholder="Passkey" type="password" autoComplete="new-password" value={form.passkey}
            onChange={(e) => setForm({ ...form, passkey: e.target.value })}
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5" />
          <div className="flex items-center gap-2">
            <select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5">
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
              Enabled
            </label>
          </div>
          <p className="text-[11px] text-gray-400">Leave a secret field blank to keep its current saved value.</p>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs font-bold text-gray-500 px-3 py-1.5">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EtimsConfigCard({ businessId, config, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    provider: 'generic-http', apiUrl: '', apiKey: '',
    environment: 'sandbox', enabled: true,
  });

  useEffect(() => {
    if (config) {
      setForm((f) => ({
        ...f,
        provider: config.provider || 'generic-http',
        environment: config.environment || 'sandbox',
        enabled: !!config.enabled,
      }));
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Same rule as M-Pesa: only send apiKey if the user actually typed
      // one — an empty string would overwrite the real saved secret.
      // apiUrl isn't secret (it's not select:false / encrypted like apiKey
      // is expected to be), so it's always safe to send as typed.
      const credentials = {
        apiUrl: form.apiUrl,
        ...(form.apiKey && { apiKey: form.apiKey }),
      };

      await API.patch(`/superadmin/businesses/${businessId}/etims-config`, {
        provider: form.provider,
        credentials,
        environment: form.environment,
        enabled: form.enabled,
      });
      toast.success('eTIMS configuration saved');
      setEditing(false);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save eTIMS config');
    } finally {
      setSaving(false);
    }
  };

  if (config === undefined) return <div className="bg-white rounded-xl p-4 border border-gray-200 text-xs text-gray-400">Loading…</div>;

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ReceiptIcon size={15} className="text-blue-600" />
          <span className="text-sm font-bold">eTIMS</span>
        </div>
        <ConfigStatusBadge enabled={config?.enabled} />
      </div>

      {!editing ? (
        <>
          {config ? (
            <p className="text-xs text-gray-500">
              Provider: <span className="font-semibold text-gray-700">{config.provider}</span> · {config.environment}
              {config.status && <> · {config.status}</>}
            </p>
          ) : (
            <p className="text-xs text-gray-400">No eTIMS provider configured.</p>
          )}
          <button
            onClick={() => setEditing(true)}
            className="mt-3 text-xs font-bold text-orange-500 hover:text-orange-600"
          >
            {config ? 'Update' : 'Set up eTIMS'}
          </button>
        </>
      ) : (
        <div className="space-y-2">
          <input placeholder="Provider (e.g. generic-http)" autoComplete="off" value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5" />
          <input placeholder="API URL" autoComplete="off" value={form.apiUrl}
            onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5" />
          <input placeholder="API Key" type="password" autoComplete="new-password" value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5" />
          <div className="flex items-center gap-2">
            <select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5">
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
              Enabled
            </label>
          </div>
          <p className="text-[11px] text-gray-400">Leave API Key blank to keep its current saved value.</p>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs font-bold text-gray-500 px-3 py-1.5">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}