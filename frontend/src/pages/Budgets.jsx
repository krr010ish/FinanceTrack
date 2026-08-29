import { useEffect, useState } from "react";
import { getBudgets, setBudget, deleteBudget, getCategories, getSummary } from "../api";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function Budgets() {
  const [budgets,  setBudgets]  = useState([]);
  const [cats,     setCats]     = useState([]);
  const [spending, setSpending] = useState({});   // category_id → spent
  const [form,     setForm]     = useState({ category_id:"", limit_amount:"" });
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState("");

  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;

  const load = async () => {
    const [b, c, s] = await Promise.all([getBudgets(), getCategories(), getSummary(monthStr)]);
    setBudgets(b.data);
    setCats(c.data);
    // build spending map
    const map = {};
    (s.data.breakdown || []).forEach(item => { map[item.category_id] = item.total; });
    setSpending(map);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setErr(""); setSaving(true);
    try {
      await setBudget({ category_id: parseInt(form.category_id), limit_amount: parseFloat(form.limit_amount) });
      toast.success("Budget saved.");
      setForm({ category_id:"", limit_amount:"" });
      load();
    } catch (ex) {
      setErr(ex.response?.data?.error || "Failed.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await deleteBudget(id);
    toast.success("Budget removed.");
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Budget Limits</div>
          <div className="page-subtitle">Set monthly spending caps per category</div>
        </div>
      </div>

      {/* Add form */}
      <div className="card mb-4">
        <div className="card-title" style={{marginBottom:12}}>Set a Budget</div>
        <form onSubmit={handleAdd} style={{display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end"}}>
          <div className="form-group" style={{marginBottom:0, flex:1, minWidth:160}}>
            <label className="form-label">Category</label>
            <select className="form-select" value={form.category_id} onChange={e=>setForm(f=>({...f,category_id:e.target.value}))} required>
              <option value="">Select…</option>
              {cats.map(c => <option key={c.category_id} value={c.category_id}>{c.cat_name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0, flex:1, minWidth:140}}>
            <label className="form-label">Monthly Limit (₹)</label>
            <input className="form-input" type="number" min="1" step="0.01" value={form.limit_amount}
              onChange={e=>setForm(f=>({...f,limit_amount:e.target.value}))} required placeholder="5000"/>
          </div>
          <button className="btn btn-primary" disabled={saving} style={{height:38}}>
            {saving ? <span className="spinner"/> : <><Plus size={14}/> Save</>}
          </button>
        </form>
        {err && <div className="form-error mt-4">{err}</div>}
      </div>

      {/* Budget cards */}
      {budgets.length === 0 ? (
        <div className="empty-state"><p>No budgets set yet. Add one above.</p></div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:12}}>
          {budgets.map(b => {
            const spent   = spending[b.category_id] || 0;
            const pct     = Math.min((spent / b.limit_amount) * 100, 100);
            const barClass = pct >= 100 ? "progress-red" : pct >= 80 ? "progress-amber" : "progress-green";
            return (
              <div className="card" key={b.budget_id}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
                  <div>
                    <div style={{fontWeight:700, fontSize:15}}>{b.category}</div>
                    <div className="text-muted">₹{spent.toLocaleString("en-IN")} of ₹{b.limit_amount.toLocaleString("en-IN")} spent</div>
                  </div>
                  <div style={{display:"flex", alignItems:"center", gap:12}}>
                    <div style={{fontWeight:700, fontSize:18, color: pct>=100?"var(--red)": pct>=80?"var(--amber)":"var(--green)"}}>
                      {pct.toFixed(0)}%
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b.budget_id)}><Trash2 size={13}/></button>
                  </div>
                </div>
                <div className="progress-wrap">
                  <div className={`progress-bar ${barClass}`} style={{width:`${pct}%`}}/>
                </div>
                {pct >= 100 && <div className="alert alert-critical" style={{marginTop:10}}>⚠ Budget exceeded for {b.category}!</div>}
                {pct >= 80 && pct < 100 && <div className="alert alert-warning" style={{marginTop:10}}>You've used {pct.toFixed(0)}% of your {b.category} budget.</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
