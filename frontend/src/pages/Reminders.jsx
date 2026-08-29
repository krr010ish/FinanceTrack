import { useEffect, useState } from "react";
import { getReminders, addReminder, markPaid, deleteReminder } from "../api";
import { Plus, CheckCircle, Trash2, Bell } from "lucide-react";
import toast from "react-hot-toast";

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [form, setForm] = useState({ bill_name:"", due_date:"", amount:"" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = () => getReminders().then(r => setReminders(r.data));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault(); setErr(""); setSaving(true);
    try {
      await addReminder({ ...form, amount: parseFloat(form.amount) });
      toast.success("Reminder added.");
      setForm({ bill_name:"", due_date:"", amount:"" });
      load();
    } catch (ex) {
      setErr(ex.response?.data?.error || "Failed.");
    } finally { setSaving(false); }
  };

  const handlePay = async (id, name) => {
    try {
      const r = await markPaid(id);
      toast.success(r.data.message || `${name} marked as paid.`);
      load();
    } catch (ex) {
      toast.error(ex.response?.data?.error || "Failed.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this reminder?")) return;
    await deleteReminder(id);
    toast.success("Reminder deleted.");
    load();
  };

  const today = new Date().toISOString().split("T")[0];

  const isDue = (due) => due <= today;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Payment Reminders</div>
          <div className="page-subtitle">Track recurring bills — mark as paid to auto-log the expense</div>
        </div>
      </div>

      {/* Add form */}
      <div className="card mb-4">
        <div className="card-title" style={{marginBottom:12}}>Add a Reminder</div>
        <form onSubmit={handleAdd} style={{display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end"}}>
          <div className="form-group" style={{flex:2, minWidth:160, marginBottom:0}}>
            <label className="form-label">Bill Name</label>
            <input className="form-input" value={form.bill_name} onChange={set("bill_name")} placeholder="e.g. Electricity Bill" required/>
          </div>
          <div className="form-group" style={{flex:1, minWidth:140, marginBottom:0}}>
            <label className="form-label">Due Date</label>
            <input className="form-input" type="date" value={form.due_date} onChange={set("due_date")} required/>
          </div>
          <div className="form-group" style={{flex:1, minWidth:120, marginBottom:0}}>
            <label className="form-label">Amount (₹)</label>
            <input className="form-input" type="number" min="0.01" step="0.01" value={form.amount} onChange={set("amount")} required placeholder="0.00"/>
          </div>
          <button className="btn btn-primary" disabled={saving} style={{height:38}}>
            {saving ? <span className="spinner"/> : <><Plus size={14}/> Add</>}
          </button>
        </form>
        {err && <div className="form-error mt-4">{err}</div>}
      </div>

      {/* List */}
      {reminders.length === 0 ? (
        <div className="empty-state"><Bell size={32}/><p>No reminders yet. Add a recurring bill above.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Bill Name</th><th>Due Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {reminders.map(r => (
                <tr key={r.reminder_id}>
                  <td style={{fontWeight:600}}>{r.bill_name}</td>
                  <td>
                    {r.due_date}
                    {r.status === "Pending" && isDue(r.due_date) &&
                      <span className="badge badge-red" style={{marginLeft:8}}>Due!</span>}
                  </td>
                  <td>₹{Number(r.amount).toLocaleString("en-IN")}</td>
                  <td><span className={`badge ${r.status==="Paid"?"badge-green":"badge-amber"}`}>{r.status}</span></td>
                  <td>
                    <div style={{display:"flex", gap:6}}>
                      {r.status === "Pending" && (
                        <button className="btn btn-success btn-sm" onClick={() => handlePay(r.reminder_id, r.bill_name)}>
                          <CheckCircle size={13}/> Mark Paid
                        </button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.reminder_id)}>
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
