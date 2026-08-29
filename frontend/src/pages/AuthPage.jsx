import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { login, register } from "../api";
import toast from "react-hot-toast";

export default function AuthPage() {
  const { setUser } = useAuth();
  const [mode, setMode]       = useState("login");   // login | register
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const [form, setForm] = useState({
    username: "", email: "", password: "", monthly_income: "",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const r = await login({ username: form.username, password: form.password });
        setUser(r.data.user);
        toast.success(`Welcome back, ${r.data.user.username}!`);
      } else {
        const r = await register({
          username:       form.username,
          email:          form.email,
          password:       form.password,
          monthly_income: parseFloat(form.monthly_income) || 0,
        });
        setUser(r.data.user);
        toast.success("Account created. Welcome to FinTrack!");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">Fin<span>Track</span></div>
        <div className="auth-subtitle">
          {mode === "login" ? "Sign in to your account" : "Create your free account"}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" value={form.username} onChange={set("username")}
              placeholder="your_username" required autoFocus />
          </div>

          {mode === "register" && (
            <>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={set("email")}
                  placeholder="you@email.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Income (₹)</label>
                <input className="form-input" type="number" min="0" step="0.01"
                  value={form.monthly_income} onChange={set("monthly_income")}
                  placeholder="0.00" />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={form.password} onChange={set("password")}
              placeholder="••••••" required minLength={6} />
          </div>

          {error && <div className="alert alert-critical mb-4">{error}</div>}

          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? <span className="spinner" /> : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === "login" ? (
            <>Don't have an account? <a onClick={() => { setMode("register"); setError(""); }}>Register</a></>
          ) : (
            <>Already have an account? <a onClick={() => { setMode("login"); setError(""); }}>Sign In</a></>
          )}
        </div>
      </div>
    </div>
  );
}
