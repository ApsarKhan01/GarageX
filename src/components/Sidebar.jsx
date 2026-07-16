import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const NAV = [
  { to: "/", icon: "▦", label: "Dashboard", end: true },
  { to: "/fuel", icon: "⛽", label: "Fuel Tracker" },
  { to: "/service", icon: "🔧", label: "Service History" },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

export default function Sidebar() {
  return (
    <motion.aside
      className="sidebar"
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="brand"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="brand-icon">🚗</div>
        <div className="brand-name">GarageX</div>
      </motion.div>

      <motion.nav className="sidebar-nav" variants={container} initial="hidden" animate="show" aria-label="Main">
        {NAV.map((link) => (
          <motion.div key={link.to} variants={item}>
            <NavLink
              to={link.to}
              end={link.end}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active"
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 10,
                        background: "rgba(196, 30, 58, 0.15)",
                        border: "1px solid rgba(196, 30, 58, 0.35)",
                        zIndex: -1,
                      }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="nav-icon">{link.icon}</span>
                  {link.label}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </motion.nav>

      <motion.div
        className="sidebar-footer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="premium-card">
          <h4>Go Premium</h4>
          <p>Unlock advanced analytics & cloud backup</p>
          <button className="btn block" type="button">Upgrade Now</button>
        </div>
        <div className="user-card">
          <div className="user-avatar">AK</div>
          <div className="user-info">
            <strong>Apsar Khan</strong>
            <span>apsar@email.com</span>
          </div>
        </div>
      </motion.div>
    </motion.aside>
  );
}
