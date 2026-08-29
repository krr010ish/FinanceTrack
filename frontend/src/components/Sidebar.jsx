import { NavLink } from "react-router-dom";
import { LayoutDashboard, ArrowLeftRight, PiggyBank, Bell, UserCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const links = [
  { to:"/",            icon: LayoutDashboard, label:"Dashboard"    },
  { to:"/transactions",icon: ArrowLeftRight,  label:"Transactions" },
  { to:"/budgets",     icon: PiggyBank,       label:"Budgets"      },
  { to:"/reminders",   icon: Bell,            label:"Reminders"    },
  { to:"/profile",     icon: UserCircle,      label:"Profile"      },
];

export default function Sidebar() {
  const { user } = useAuth();
  return (
    <div className="sidebar">
      <div className="sidebar-logo">Fin<span>Track</span></div>
      <nav className="sidebar-nav">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to==="/"} className={({ isActive }) => `nav-item ${isActive?"active":""}`}>
            <Icon size={17}/>{label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer" style={{fontSize:12, color:"rgba(255,255,255,.5)"}}>
        {user?.username}
      </div>
    </div>
  );
}
