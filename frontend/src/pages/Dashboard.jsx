import { useEffect, useState } from "react";
import { getSummary, getPredictions } from "../api";
import { useAuth } from "../context/AuthContext";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";

const COLORS = ["#1A3C6E","#3B82F6","#22C55E","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6","#F97316","#64748B","#06B6D4","#84CC16"];

function SummaryCard({ title, value, icon: Icon, colorClass }) {
  return (
    <div className="card" style={{ display:"flex", alignItems:"center", gap:16 }}>
      <div style={{ background:"var(--bg)", borderRadius:10, padding:12 }}>
        <Icon size={22} color="var(--navy)" />
      </div>
      <div>
        <div className="card-title">{title}</div>
        <div className={`card-value ${colorClass||""}`}>₹{Number(value).toLocaleString("en-IN", { maximumFractionDigits:0 })}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary,    setSummary]    = useState(null);
  const [breakdown,  setBreakdown]  = useState([]);
  const [predictions,setPredictions]= useState([]);
  const [loading,    setLoading]    = useState(true);

  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;

  useEffect(() => {
    setLoading(true);
    Promise.all([getSummary(monthStr), getPredictions()])
      .then(([s, p]) => {
        setSummary(s.data.summary);
        setBreakdown(s.data.breakdown);
        setPredictions(p.data.predictions || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex-center" style={{height:300}}><span className="spinner"/></div>;

  const net = summary?.net_position ?? 0;
  const isLoss = net < 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Welcome back, {user?.username} · {summary?.month}</div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid-4">
        <SummaryCard title="Monthly Income"  value={summary?.total_income  ?? 0} icon={Wallet}       />
        <SummaryCard title="Total Expenses"  value={summary?.total_expense ?? 0} icon={TrendingDown}  colorClass="red" />
        <SummaryCard title={isLoss ? "Net Loss" : "Net Surplus"} value={Math.abs(net)} icon={isLoss ? AlertTriangle : TrendingUp} colorClass={isLoss ? "red":"green"} />
        <SummaryCard title="Stated Income"   value={user?.monthly_income   ?? 0} icon={Wallet}       />
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ marginBottom:24 }}>
        {/* Pie */}
        <div className="card">
          <div className="card-title" style={{marginBottom:12}}>Spending by Category</div>
          {breakdown.length === 0 ? (
            <div className="empty-state"><p>No expenses this month yet.</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={breakdown} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({category, percent}) => `${category} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {breakdown.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `₹${v.toLocaleString("en-IN")}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar */}
        <div className="card">
          <div className="card-title" style={{marginBottom:12}}>Category Totals (₹)</div>
          {breakdown.length === 0 ? (
            <div className="empty-state"><p>No data to display.</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={breakdown} margin={{left:0, right:10}}>
                <XAxis dataKey="category" tick={{fontSize:10}} />
                <YAxis tick={{fontSize:10}} />
                <Tooltip formatter={(v) => `₹${v.toLocaleString("en-IN")}`} />
                <Bar dataKey="total" name="Spent" radius={[4,4,0,0]}>
                  {breakdown.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* WMA Predictions */}
      <div className="card">
        <div className="card-title" style={{marginBottom:12}}>Next Month Prediction (WMA)</div>
        {predictions.length === 0 ? (
          <div className="empty-state"><p>Not enough data for prediction. Log at least one month of expenses.</p></div>
        ) : (
          <div style={{display:"flex", flexWrap:"wrap", gap:12}}>
            {predictions.map((p) => (
              <div key={p.category_id} style={{background:"var(--bg)", borderRadius:8, padding:"10px 16px", minWidth:140}}>
                <div className="text-muted">{p.category}</div>
                <div style={{fontWeight:700, fontSize:16, color:"var(--navy)"}}>₹{p.predicted_amount.toLocaleString("en-IN")}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
