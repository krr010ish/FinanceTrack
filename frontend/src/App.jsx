import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Budgets from "./pages/Budgets";
import Reminders from "./pages/Reminders";
import Profile from "./pages/Profile";

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <span className="spinner"/>
    </div>
  );

  if (!user) return <AuthPage />;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/"             element={<Dashboard    />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets"      element={<Budgets      />} />
          <Route path="/reminders"    element={<Reminders    />} />
          <Route path="/profile"      element={<Profile      />} />
          <Route path="*"             element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
