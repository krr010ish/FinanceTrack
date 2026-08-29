import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { updateMe } from "../api";
import toast from "react-hot-toast";

export default function Profile() {
  const { user, setUser, signOut } = useAuth();
  const [form, setForm] = useState({ email: user?.email || "", monthly_income: user?.monthly_income || "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault(); setErr(""); setSaving(true);
    try {
      const r = await updateMe({ email: form.email, monthly_income: parseFloat(form.monthly_income) || 0 });
      setUser(r.data.user);
      toast.success("Profile updated.");
    } catch (ex) {
      setErr(ex.response?.data?.error || "Failed to update.");
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Profile</div>
          <div className="page-subtitle">Manage your account details</div>
        </div>
      </div>

      <div className="card" style={{maxWidth:460}}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" value={user?.username || ""} disabled style={{background:"var(--bg)", color:"var(--muted)"}}/>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={set("email")} required/>
          </div>
          <div className="form-group">
            <label className="form-label">Monthly Income (₹)</label>
            <input className="form-input" type="number" min="0" step="0.01" value={form.monthly_income} onChange={set("monthly_income")} placeholder="0.00"/>
          </div>
          {err && <div className="form-error mb-4">{err}</div>}
          <button className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner"/> : "Save Changes"}
          </button>
        </form>
      </div>

      <div className="card" style={{maxWidth:460, marginTop:16}}>
        <div className="card-title" style={{marginBottom:12}}>Session</div>
        <p className="text-muted" style={{marginBottom:14}}>Signed in as <strong>{user?.username}</strong>. Session expires after 30 minutes of inactivity.</p>
        <button className="btn btn-danger" onClick={signOut}>Sign Out</button>
      </div>
    </div>
  );
}
