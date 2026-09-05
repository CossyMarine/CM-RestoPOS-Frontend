import { useState } from "react";
import API from "../api/axios";

// Superadmin business onboarding wizard.
// Uses the shared axios instance (src/api/axios.js) — same withCredentials
// cookie session and baseURL every other page already relies on.

const STEPS = [
  { key: "business", label: "Business information" },
  { key: "admin", label: "Create business admin" },
  { key: "settings", label: "Payment & tax" },
  { key: "activate", label: "Activate" },
];

const emptyState = {
  businessId: null,
  business: { name: "", phone: "", email: "", kraPin: "", plan: "trial" },
  admin: { fullName: "", method: "phone", contact: "", password: "" },
  settings: { tillNumber: "", tillName: "", taxRatePercent: 16, taxInclusive: true },
};

export default function BusinessOnboardingPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState(emptyState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const step = STEPS[stepIndex];

  const updateField = (section, field, value) => {
    setState((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));

  const submitBusiness = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.post("/superadmin/businesses", state.business);
      setState((prev) => ({ ...prev, businessId: data.business._id }));
      goNext();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitAdmin = async () => {
    setLoading(true);
    setError("");
    try {
      await API.post(`/superadmin/businesses/${state.businessId}/admin`, state.admin);
      goNext();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitSettings = async () => {
    setLoading(true);
    setError("");
    try {
      await API.patch(`/superadmin/businesses/${state.businessId}/settings`, {
        tillNumber: state.settings.tillNumber,
        tillName: state.settings.tillName,
        tax: { ratePercent: Number(state.settings.taxRatePercent), inclusive: state.settings.taxInclusive },
      });
      goNext();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitActivate = async () => {
    setLoading(true);
    setError("");
    try {
      await API.patch(`/superadmin/businesses/${state.businessId}/status`, { status: "active" });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const startAnother = () => {
    setState(emptyState);
    setStepIndex(0);
    setDone(false);
    setError("");
  };

  return (
    <div style={styles.page}>
      <style>{fontStack}</style>
      <div style={styles.shell}>
        <aside style={styles.stepRail}>
          <h1 style={styles.railTitle}>Onboard a business</h1>
          <ol style={styles.stepList}>
            {STEPS.map((s, i) => {
              const isActive = i === stepIndex && !done;
              const isComplete = i < stepIndex || done;
              return (
                <li key={s.key} style={styles.stepItem}>
                  <span
                    style={{
                      ...styles.stepNumber,
                      ...(isActive ? styles.stepNumberActive : {}),
                      ...(isComplete ? styles.stepNumberComplete : {}),
                    }}
                  >
                    {isComplete ? "✓" : i + 1}
                  </span>
                  <span style={{ ...styles.stepLabel, ...(isActive ? styles.stepLabelActive : {}) }}>
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </aside>

        <main style={styles.formPanel}>
          {error && <div style={styles.errorBanner}>{error}</div>}

          {!done && step.key === "business" && (
            <div>
              <h2 style={styles.formTitle}>Business information</h2>
              <p style={styles.formHint}>This creates the tenant record everything else attaches to.</p>
              <Field label="Business name" value={state.business.name} onChange={(v) => updateField("business", "name", v)} required />
              <Field label="Phone" value={state.business.phone} onChange={(v) => updateField("business", "phone", v)} />
              <Field label="Email" value={state.business.email} onChange={(v) => updateField("business", "email", v)} />
              <Field label="KRA PIN" value={state.business.kraPin} onChange={(v) => updateField("business", "kraPin", v)} />
              <SelectField
                label="Plan"
                value={state.business.plan}
                onChange={(v) => updateField("business", "plan", v)}
                options={["trial", "basic", "pro", "enterprise"]}
              />
              <PrimaryButton onClick={submitBusiness} disabled={loading || !state.business.name}>
                {loading ? "Creating…" : "Create business"}
              </PrimaryButton>
            </div>
          )}

          {!done && step.key === "admin" && (
            <div>
              <h2 style={styles.formTitle}>Create business admin</h2>
              <p style={styles.formHint}>The first login this restaurant's owner or manager will use.</p>
              <Field label="Full name" value={state.admin.fullName} onChange={(v) => updateField("admin", "fullName", v)} required />
              <SelectField
                label="Contact method"
                value={state.admin.method}
                onChange={(v) => updateField("admin", "method", v)}
                options={["phone", "email"]}
              />
              <Field
                label={state.admin.method === "phone" ? "Phone" : "Email"}
                value={state.admin.contact}
                onChange={(v) => updateField("admin", "contact", v)}
                required
              />
              <Field
                label="Temporary password"
                type="password"
                value={state.admin.password}
                onChange={(v) => updateField("admin", "password", v)}
                required
              />
              <PrimaryButton
                onClick={submitAdmin}
                disabled={loading || !state.admin.fullName || !state.admin.contact || !state.admin.password}
              >
                {loading ? "Creating…" : "Create admin account"}
              </PrimaryButton>
            </div>
          )}

          {!done && step.key === "settings" && (
            <div>
              <h2 style={styles.formTitle}>Payment & tax</h2>
              <p style={styles.formHint}>Configured up front so the admin's first login is already usable.</p>
              <Field label="Till number" value={state.settings.tillNumber} onChange={(v) => updateField("settings", "tillNumber", v)} />
              <Field label="Till display name" value={state.settings.tillName} onChange={(v) => updateField("settings", "tillName", v)} />
              <Field
                label="Tax rate (%)"
                type="number"
                value={state.settings.taxRatePercent}
                onChange={(v) => updateField("settings", "taxRatePercent", v)}
              />
              <label style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={state.settings.taxInclusive}
                  onChange={(e) => updateField("settings", "taxInclusive", e.target.checked)}
                />
                <span>Menu prices already include tax</span>
              </label>
              <PrimaryButton onClick={submitSettings} disabled={loading}>
                {loading ? "Saving…" : "Save settings"}
              </PrimaryButton>
            </div>
          )}

          {!done && step.key === "activate" && (
            <div>
              <h2 style={styles.formTitle}>Activate</h2>
              <p style={styles.formHint}>The business goes live the moment you confirm this.</p>
              <PrimaryButton onClick={submitActivate} disabled={loading}>
                {loading ? "Activating…" : "Activate business"}
              </PrimaryButton>
            </div>
          )}

          {done && (
            <div>
              <h2 style={styles.formTitle}>Business is live</h2>
              <p style={styles.formHint}>{state.business.name} can log in and start taking orders.</p>
              <PrimaryButton onClick={startAnother}>Onboard another business</PrimaryButton>
            </div>
          )}
        </main>

        <aside style={styles.receipt}>
          <div style={styles.receiptInner}>
            <div style={styles.receiptHeader}>ONBOARDING RECEIPT</div>
            <ReceiptLine label="Business" value={state.business.name || "—"} />
            <ReceiptLine label="Plan" value={state.business.plan} />
            <ReceiptLine label="KRA PIN" value={state.business.kraPin || "—"} />
            <div style={styles.receiptDivider} />
            <ReceiptLine label="Admin" value={state.admin.fullName || "—"} filled={stepIndex > 1 || done} />
            <ReceiptLine
              label="Login"
              value={state.admin.contact || "—"}
              filled={stepIndex > 1 || done}
            />
            <div style={styles.receiptDivider} />
            <ReceiptLine label="Till" value={state.settings.tillNumber || "—"} filled={stepIndex > 2 || done} />
            <ReceiptLine
              label="Tax rate"
              value={`${state.settings.taxRatePercent}%`}
              filled={stepIndex > 2 || done}
            />
            <div style={styles.receiptDivider} />
            <ReceiptLine label="Status" value={done ? "ACTIVE" : "pending"} strong={done} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <label style={styles.fieldLabel}>
      {label}{required && <span style={styles.required}> *</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={styles.input}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label style={styles.fieldLabel}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} style={styles.input}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function PrimaryButton({ children, ...props }) {
  return (
    <button {...props} style={{ ...styles.button, ...(props.disabled ? styles.buttonDisabled : {}) }}>
      {children}
    </button>
  );
}

function ReceiptLine({ label, value, filled = true, strong = false }) {
  return (
    <div style={styles.receiptLine}>
      <span style={styles.receiptLabel}>{label}</span>
      <span style={{ ...styles.receiptValue, ...(strong ? styles.receiptValueStrong : {}), opacity: filled ? 1 : 0.3 }}>
        {value}
      </span>
    </div>
  );
}

const fontStack = `
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

const INK = "#1C1B18";
const PAPER = "#F7F3EC";
const ACCENT = "#1B4B43";
const LINE = "#DDD5C4";

const styles = {
  page: {
    minHeight: "100vh",
    background: PAPER,
    color: INK,
    fontFamily: "Georgia, 'Iowan Old Style', 'Times New Roman', serif",
    padding: "48px 24px",
  },
  shell: {
    maxWidth: 980,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "220px 1fr 280px",
    gap: 40,
    alignItems: "start",
  },
  stepRail: { paddingTop: 8 },
  railTitle: {
    fontSize: 18,
    fontWeight: 400,
    marginBottom: 28,
    letterSpacing: "0.01em",
  },
  stepList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 20 },
  stepItem: { display: "flex", alignItems: "center", gap: 12 },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    border: `1px solid ${LINE}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontFamily: "system-ui, sans-serif",
    flexShrink: 0,
    color: "#8A8272",
  },
  stepNumberActive: { borderColor: ACCENT, color: ACCENT, fontWeight: 600 },
  stepNumberComplete: { background: ACCENT, borderColor: ACCENT, color: PAPER },
  stepLabel: { fontSize: 14, fontFamily: "system-ui, sans-serif", color: "#8A8272" },
  stepLabelActive: { color: INK, fontWeight: 600 },

  formPanel: {
    background: "#FFFFFF",
    border: `1px solid ${LINE}`,
    borderRadius: 4,
    padding: "36px 40px",
  },
  formTitle: { fontSize: 24, fontWeight: 400, margin: "0 0 6px" },
  formHint: {
    fontFamily: "system-ui, sans-serif",
    fontSize: 14,
    color: "#6B6455",
    margin: "0 0 28px",
    lineHeight: 1.5,
  },
  fieldLabel: {
    display: "block",
    fontFamily: "system-ui, sans-serif",
    fontSize: 13,
    color: "#4A4438",
    marginBottom: 16,
  },
  required: { color: "#A33A2E" },
  input: {
    display: "block",
    width: "100%",
    marginTop: 6,
    padding: "9px 10px",
    fontSize: 14,
    fontFamily: "system-ui, sans-serif",
    border: `1px solid ${LINE}`,
    borderRadius: 3,
    background: PAPER,
    color: INK,
    boxSizing: "border-box",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "system-ui, sans-serif",
    fontSize: 14,
    marginBottom: 24,
    color: "#4A4438",
  },
  button: {
    marginTop: 8,
    padding: "11px 22px",
    fontSize: 14,
    fontFamily: "system-ui, sans-serif",
    fontWeight: 600,
    background: ACCENT,
    color: PAPER,
    border: "none",
    borderRadius: 3,
    cursor: "pointer",
  },
  buttonDisabled: { opacity: 0.4, cursor: "not-allowed" },
  errorBanner: {
    background: "#F6E7E4",
    border: "1px solid #D9A79C",
    color: "#7A2E22",
    fontFamily: "system-ui, sans-serif",
    fontSize: 13,
    padding: "10px 14px",
    borderRadius: 3,
    marginBottom: 24,
  },

  receipt: { paddingTop: 8 },
  receiptInner: {
    background: "#FFFFFF",
    border: `1px dashed ${LINE}`,
    padding: "24px 20px",
    fontFamily: "'Courier New', monospace",
    fontSize: 12.5,
  },
  receiptHeader: {
    textAlign: "center",
    fontWeight: 700,
    letterSpacing: "0.08em",
    marginBottom: 18,
    fontSize: 12,
  },
  receiptLine: { display: "flex", justifyContent: "space-between", gap: 8, padding: "3px 0" },
  receiptLabel: { color: "#8A8272" },
  receiptValue: { textAlign: "right", wordBreak: "break-word" },
  receiptValueStrong: { color: ACCENT, fontWeight: 700 },
  receiptDivider: { borderTop: `1px dashed ${LINE}`, margin: "12px 0" },
};