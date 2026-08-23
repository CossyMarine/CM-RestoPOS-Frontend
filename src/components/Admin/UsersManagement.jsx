import { useState, useEffect } from 'react';
import { UserPlus, ShieldCheck, Ban, CheckCircle2, RefreshCw, Users2 } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import ConfirmModal from './ConfirmModal';
import { validatePassword } from '../../utils/validatePassword';
import PasswordRequirements from '../PasswordRequirements';

const ROLE_OPTIONS = [
    { value: 'admin', label: 'Admin' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'waiter', label: 'Waiter' },
    { value: 'accountant', label: 'Accountant' },
];

const FILTER_TABS = [
    { value: 'all', label: 'All Users' },
    { value: 'staff', label: 'Staff & Admin' },
    { value: 'customer', label: 'Customers' },
];

const EMPTY_FORM = {
    fullName: '',
    method: 'email',
    contact: '',
    password: '',
    role: 'waiter',
};

export default function UsersManagement() {
    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [creating, setCreating] = useState(false);
    const [roleChange, setRoleChange] = useState(null); // { user, newRole }
    const [statusChange, setStatusChange] = useState(null); // user
    const [working, setWorking] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await API.get('/auth/users/all');
            setUsers(res.data);
        } catch (err) {
            console.error('Failed to fetch users', err);
            toast.error('Failed to load users');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const roleLabel = (u) => (u.isAdmin ? 'Admin' : u.role.charAt(0).toUpperCase() + u.role.slice(1));

    const currentRoleValue = (u) => (u.isAdmin ? 'admin' : u.role);

    const visibleUsers = users.filter((u) => {
        if (filter === 'staff') return u.isAdmin || u.role !== 'customer';
        if (filter === 'customer') return !u.isAdmin && u.role === 'customer';
        return true;
    });

       const handleCreate = async () => {
        if (!form.fullName || !form.contact || !form.password) {
            toast.error('Fill in all fields');
            return;
        }
        const passwordCheck = validatePassword(form.password);
        if (!passwordCheck.valid) {
            toast.error(passwordCheck.errors[0]);
            return;
        }

        setCreating(true);
        try {
            await API.post('/auth/register', {
                fullName: form.fullName,
                method: form.method,
                contact: form.contact,
                password: form.password,
                isAdmin: form.role === 'admin',
                role: form.role === 'admin' ? undefined : form.role,
            });
            toast.success('Staff account created');
            setForm(EMPTY_FORM);
            fetchUsers();
        } catch (err) {
            console.error('Failed to create user', err);
            const requirements = err.response?.data?.requirements;
            if (requirements?.length) {
                requirements.forEach((r) => toast.error(r));
            } else {
                toast.error(err.response?.data?.message || 'Failed to create account');
            }
        }
        setCreating(false);
    };

    const confirmRoleChange = async () => {
        const { user, newRole } = roleChange;
        setWorking(true);
        try {
            const payload =
                newRole === 'admin' ? { isAdmin: true } : { isAdmin: false, role: newRole };
            await API.patch(`/auth/users/${user.id}/role`, payload);
            toast.success(`${user.fullName} is now ${ROLE_OPTIONS.find((r) => r.value === newRole)?.label}`);
            setRoleChange(null);
            fetchUsers();
        } catch (err) {
            console.error('Failed to update role', err);
            toast.error(err.response?.data?.message || 'Failed to update role');
        }
        setWorking(false);
    };

    const confirmStatusChange = async () => {
        setWorking(true);
        try {
            await API.patch(`/auth/users/${statusChange.id}/status`);
            toast.success(statusChange.isActive ? 'Account deactivated' : 'Account reactivated');
            setStatusChange(null);
            fetchUsers();
        } catch (err) {
            console.error('Failed to update status', err);
            toast.error(err.response?.data?.message || 'Failed to update status');
        }
        setWorking(false);
    };

    return (
        <div className="space-y-8 bg-gray-50 text-gray-800">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Manage Users</h2>
                    <p className="text-sm text-gray-500">Promote customers or staff, change roles, and control account access</p>
                </div>
                <button
                    onClick={fetchUsers}
                    className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-orange-500/40 text-gray-500 hover:text-orange-500 px-3 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Create account form */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 h-fit shadow-sm">
                    <h3 className="text-base font-black text-gray-800 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                        <UserPlus size={16} className="text-orange-500" />
                        Add Staff Account
                    </h3>

                    <div className="space-y-4">
                        <Field label="Full Name">
                            <input
                                value={form.fullName}
                                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                placeholder="Jane Doe"
                                className="input"
                            />
                        </Field>

                        <Field label="Contact Method">
                            <select
                                value={form.method}
                                onChange={(e) => setForm({ ...form, method: e.target.value })}
                                className="input"
                            >
                                <option value="email">Email</option>
                                <option value="phone">Phone</option>
                            </select>
                        </Field>

                        <Field label={form.method === 'email' ? 'Email Address' : 'Phone Number'}>
                            <input
                                value={form.contact}
                                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                                placeholder={form.method === 'email' ? 'jane@resto.com' : '07xxxxxxxx'}
                                className="input"
                            />
                        </Field>

                        <Field label="Password">
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                placeholder="Min. 8 characters"
                                className="input"
                            />
                            <PasswordRequirements password={form.password} />
                        </Field>

                        <Field label="Role">
                            <select
                                value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value })}
                                className="input"
                            >
                                {ROLE_OPTIONS.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </Field>

                        <button
                            onClick={handleCreate}
                            disabled={creating}
                            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm disabled:opacity-50 mt-2"
                        >
                            <UserPlus size={16} />
                            {creating ? 'Creating…' : 'Create Account'}
                        </button>
                    </div>
                </div>

                {/* Users table */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3 mb-4">
                        <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                            <Users2 size={16} className="text-orange-500" />
                            {visibleUsers.length} Account{visibleUsers.length !== 1 ? 's' : ''}
                        </h3>
                        <div className="flex gap-1.5">
                            {FILTER_TABS.map((f) => (
                                <button
                                    key={f.value}
                                    onClick={() => setFilter(f.value)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                        filter === f.value
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-100 text-gray-500 hover:text-orange-500'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-gray-400 font-semibold border-b border-gray-100 sticky top-0 bg-white z-10">
                                    <th className="p-3">Name</th>
                                    <th className="p-3">Contact</th>
                                    <th className="p-3">Role</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-600">
                                {visibleUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-400 font-medium">
                                            No accounts found
                                        </td>
                                    </tr>
                                ) : (
                                    visibleUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                                            <td className="p-3 font-bold text-gray-800">{u.fullName}</td>
                                            <td className="p-3 text-xs text-gray-400">{u.email || u.phone}</td>
                                            <td className="p-3">
                                                <RoleBadge label={roleLabel(u)} isAdmin={u.isAdmin} isCustomer={!u.isAdmin && u.role === 'customer'} />
                                            </td>
                                            <td className="p-3">
                                                {u.isActive ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold">
                                                        <CheckCircle2 size={13} /> Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-red-500 text-xs font-bold">
                                                        <Ban size={13} /> Deactivated
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <select
                                                        value={currentRoleValue(u)}
                                                        onChange={(e) => {
                                                            const newRole = e.target.value;
                                                            if (newRole !== currentRoleValue(u)) {
                                                                setRoleChange({ user: u, newRole });
                                                            }
                                                        }}
                                                        className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                                                    >
                                                        {currentRoleValue(u) === 'customer' && (
                                                            <option value="customer" disabled hidden>Customer</option>
                                                        )}
                                                        {ROLE_OPTIONS.map((r) => (
                                                            <option key={r.value} value={r.value}>{r.label}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => setStatusChange(u)}
                                                        className={`text-xs font-bold transition-colors ${u.isActive ? 'text-red-500 hover:text-red-600' : 'text-emerald-600 hover:text-emerald-700'}`}
                                                    >
                                                        {u.isActive ? 'Deactivate' : 'Reactivate'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <ConfirmModal
                open={!!roleChange}
                title={roleChange?.user?.role === 'customer' ? 'Promote this customer?' : 'Change user role?'}
                description={
                    roleChange
                        ? `Set ${roleChange.user.fullName}'s role to ${ROLE_OPTIONS.find((r) => r.value === roleChange.newRole)?.label}? They'll need to log in again to see the change take effect.`
                        : ''
                }
                confirmLabel="Confirm Change"
                tone="default"
                loading={working}
                onConfirm={confirmRoleChange}
                onClose={() => setRoleChange(null)}
            />

            <ConfirmModal
                open={!!statusChange}
                title={statusChange?.isActive ? 'Deactivate account?' : 'Reactivate account?'}
                description={
                    statusChange?.isActive
                        ? `${statusChange?.fullName} won't be able to log in until reactivated.`
                        : `${statusChange?.fullName} will be able to log in again.`
                }
                confirmLabel={statusChange?.isActive ? 'Deactivate' : 'Reactivate'}
                tone={statusChange?.isActive ? 'danger' : 'default'}
                loading={working}
                onConfirm={confirmStatusChange}
                onClose={() => setStatusChange(null)}
            />

            <style>{`
                .input {
                    width: 100%;
                    background: rgb(249 250 251);
                    border: 1px solid rgb(229 231 235);
                    border-radius: 0.75rem;
                    padding: 0.6rem 0.85rem;
                    font-size: 0.875rem;
                    color: rgb(31 41 55);
                }
                .input:focus {
                    outline: none;
                    border-color: rgb(249 115 22);
                    background: white;
                    box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.1);
                }
                .input::placeholder {
                    color: rgb(156 163 175);
                }
            `}</style>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
            {children}
        </div>
    );
}

function RoleBadge({ label, isAdmin, isCustomer }) {
    return (
        <span
            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                isAdmin
                    ? 'bg-orange-50 text-orange-600 border-orange-200'
                    : isCustomer
                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}
        >
            {isAdmin && <ShieldCheck size={10} className="inline mr-1 -mt-0.5" />}
            {label}
        </span>
    );
                            }
