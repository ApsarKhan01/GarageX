import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useData } from "../context/DataContext";
import { daysUntil, greeting } from "../lib/data";

export default function Layout({ children, title, subtitle }) {
  const location = useLocation();
  const { data } = useData();
  const urgentCount = data.reminders.filter((r) => {
    const d = daysUntil(r.dueDate);
    return d !== null && d <= 7;
  }).length;

  const isDashboard = location.pathname === "/";

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <header className="topbar">
          <motion.div
            className="greeting"
            key={title}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <h1>{title || `${greeting()}, Apsar 👋`}</h1>
            <p>{subtitle || "Here's what's happening with your vehicle today."}</p>
          </motion.div>
          {isDashboard && (
            <div className="topbar-center">
              <div className="search-box">
                <span>🔍</span>
                <input type="search" placeholder="Search anything..." aria-label="Search" />
                <span className="search-kbd">⌘K</span>
              </div>
            </div>
          )}
          <div className="topbar-actions">
            <button className="icon-btn" type="button" aria-label="Notifications">
              🔔
              {urgentCount > 0 && <span className="badge">{urgentCount}</span>}
            </button>
            <button className="icon-btn" type="button" aria-label="Theme">🌙</button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function PageWrapper({ children }) {
  return <div className="page-content wide">{children}</div>;
}
