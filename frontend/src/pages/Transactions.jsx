import { useEffect, useState } from "react";
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, getCategories } from "../api";
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const today = () => new Date().toISOString().split("T")[0];

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{title}</div>
        {children}
      </div>
    </div>
  );
}

export default function Transactions() {
  const [txs,        setTxs]        = useState([]);
  const [cats,       setCats]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [alert,      setAlert]      = useState(null);
  const [filterMonth,setFilterMonth]= useState("");
  const [filterType, setFilterType] = useState("");
  const [form, setForm] = useState({ amount:"", type:"Expense", category_id:"", date:today(), description:"" });
  const [err,  setErr]  = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterMonth) params.month = filterMonth;
    if (filterType)  params.type  = filterType;
    getTransactions(params).then(r => setTxs(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { getCategories().then(r => setCats(r.data)); }, []);
  useEffect(() => { load(); }, [filterMonth, filterType]);

  const openAdd  = () => { setEditing(null); setForm({ amount:"", type:"Expense", category_id: cats[0]?.category_id || "", date:today(), description:"" }); setErr(""); setAlert(null); setShowModal(true); };
  const openEdit = (tx) => { setEditing(tx); setForm({ amount: tx.amount, type: tx.type, category_id: tx.category_id, date: tx.date, description: tx.description }); setErr(""); setAlert(null); setShowModal(true); };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setSaving(true); setAlert(null);
    try {
      const payload = { ...form, amount: parseFloat(form.amount), category_id: parseInt(form.category_id) };
      if (editing) {
        await updateTransaction(editing.trans_id, payload);
        toast.success("Transaction updated.");
      } else {
        const r = await addTransaction(payload);
        if (r.data.alert?.alert) setAlert(r.data.alert);
        toast.success("Transaction added.");
      }
      setShowModal(false);
      load();
    } catch (ex) {
      setErr(ex.response?.data?.error || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this transaction?")) return;
    await deleteTransaction(id);
    toast.success("Deleted.");
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Transactions</div>
          <div className="page-subtitle">All your income and expense entries</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/> Add Transaction</button>
      </div>

      {/* Alerts from last add */}
      {alert?.alert === "critical" && <div className="alert alert-critical mb-4"><AlertTriangle size={16}/>{alert.message}</div>}
      {alert?.alert === "warning"  && <div className="alert alert-warning  mb-4"><AlertTriangle size={16}/>{alert.message}</div>}

      {/* Filters */}
      <div style={{display:"flex", gap:12, marginBottom:16, flexWrap:"wrap"}}>
        <input className="form-input" type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{width:160}} />
        <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)} style={{width:140}}>
          <option value="">All Types</option>
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
        </select>
        {(filterMonth || filterType) && <button className="btn btn-ghost btn-sm" onClick={() => { setFilterMonth(""); setFilterType(""); }}>Clear</button>}
      </div>

      {loading ? <div className="flex-center" style={{height:200}}><span className="spinner"/></div> : (
        txs.length === 0 ? (
          <div className="empty-state"><p>No transactions found. Click "Add Transaction" to get started.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Category</th><th>Description</th><th>Type</th><th>Amount</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {txs.map(tx => (
                  <tr key={tx.trans_id}>
                    <td>{tx.date}</td>
                    <td>{tx.category}</td>
                    <td className="text-muted">{tx.description || "—"}</td>
                    <td><span className={`badge ${tx.type==="Income"?"badge-green":"badge-red"}`}>{tx.type}</span></td>
                    <td className={`font-bold ${tx.type==="Income"?"text-green":"text-red"}`}>
                      {tx.type==="Income"?"+":"−"}₹{Number(tx.amount).toLocaleString("en-IN")}
                    </td>
                    <td>
                      <div style={{display:"flex",gap:6}}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(tx)}><Pencil size={13}/></button>
                        <button className="btn btn-danger  btn-sm" onClick={() => handleDelete(tx.trans_id)}><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {showModal && (
        <Modal title={editing ? "Edit Transaction" : "Add Transaction"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={set("type")} required>
                <option value="Expense">Expense</option>
                <option value="Income">Income</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input className="form-input" type="number" min="0.01" step="0.01" value={form.amount} onChange={set("amount")} required placeholder="0.00"/>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category_id} onChange={set("category_id")} required>
                <option value="">Select category</option>
                {cats.map(c => <option key={c.category_id} value={c.category_id}>{c.cat_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" max={today()} value={form.date} onChange={set("date")} required/>
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <input className="form-input" value={form.description} onChange={set("description")} placeholder="e.g. Grocery run" maxLength={200}/>
            </div>
            {err && <div className="form-error mb-4">{err}</div>}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner"/> : editing ? "Save Changes" : "Add"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
