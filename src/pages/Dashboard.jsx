import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Layout from "../components/Layout";
import AnimatedCard, { StatCard } from "../components/AnimatedCard";
import CountUp, { AnimatedProgress } from "../components/CountUp";
import { AnimatedBar, AnimatedLinePath, AnimatedSparkline } from "../components/Charts";
import { useData } from "../context/DataContext";
import {
  computeAvgKmPerLitre,
  currentMonthKey,
  daysUntil,
  entriesThisMonth,
  estimateFuelLeft,
  formatDate,
  insuranceMonthlyShare,
  money,
  monthTrend,
  nextUpcomingService,
  serviceCostEstimate,
  sumAmount,
  uid,
  readFileAsDataUrl,
} from "../lib/data";

const listStagger = {
  show: { transition: { staggerChildren: 0.07 } },
};

const listItem = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0 },
};

export default function Dashboard() {
  const { data, update } = useData();

  const fuelMonth = sumAmount(entriesThisMonth(data.fuelEntries));
  const serviceMonth = serviceCostEstimate(data.services);
  const insuranceMonth = insuranceMonthlyShare(data.vehicle);
  const monthlyTotal = fuelMonth + serviceMonth + insuranceMonth;
  const next = nextUpcomingService(data.services);
  const serviceDays = next ? daysUntil(next.date) : null;
  const insuranceDays = daysUntil(data.vehicle.insuranceRenewal);
  const fuelLeft = estimateFuelLeft(data);
  const avgKmL = computeAvgKmPerLitre(data.fuelEntries);
  const trend = monthTrend(data.fuelEntries);

  const monthlyChart = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = currentMonthKey(d);
      const fuel = sumAmount(data.fuelEntries.filter((e) => (e.date || "").startsWith(key)));
      const svc = i === 0 ? serviceMonth : 0;
      months.push({ label: d.toLocaleString(undefined, { month: "short" }), fuel, svc });
    }
    const max = Math.max(...months.map((m) => m.fuel + m.svc), 1);
    const h = 120;
    const step = 360 / months.length;
    const lines = months.map((m, i) => {
      const x = step * i + step / 2;
      const yFuel = h - (m.fuel / max) * (h - 20);
      const yTotal = h - ((m.fuel + m.svc) / max) * (h - 20);
      return { x, yFuel, yTotal, label: m.label };
    });
    const fuelPath = lines.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.yFuel}`).join(" ");
    const totalPath = lines.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.yTotal}`).join(" ");
    return { fuelPath, totalPath, lines };
  }, [data.fuelEntries, serviceMonth]);

  const efficiencies = useMemo(() => {
    const sorted = [...data.fuelEntries]
      .filter((e) => e.litres && e.mileage)
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const vals = [];
    for (let i = 1; i < sorted.length; i++) {
      const km = Number(sorted[i].mileage) - Number(sorted[i - 1].mileage);
      if (km > 0) vals.push(km / Number(sorted[i].litres));
    }
    return vals.slice(-7);
  }, [data.fuelEntries]);

  const activities = useMemo(() => {
    const events = [];
    data.fuelEntries.forEach((e) => {
      events.push({
        type: "fuel",
        title: "Fuel Added",
        meta: `${Number(e.litres)}L · ${money(e.amount)}`,
        date: e.date,
        icon: "⛽",
      });
    });
    data.services.forEach((s) => {
      events.push({
        type: "service",
        title: s.title,
        meta: s.status === "done" ? "Completed" : "Scheduled",
        date: s.date,
        icon: "🔧",
      });
    });
    return events.sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);
  }, [data.fuelEntries, data.services]);

  const sidebarReminders = [...data.reminders]
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
    .slice(0, 4);

  const tp = data.vehicle.tyrePressure || { fl: 32, fr: 32, rl: 33, rr: 33 };

  const handleVehicleSave = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    update((prev) => ({
      ...prev,
      vehicle: {
        ...prev.vehicle,
        name: fd.get("name")?.toString().trim() || "My Car",
        plate: fd.get("plate")?.toString().trim() || "",
        mileage: Number(fd.get("mileage")) || 0,
        fuelType: fd.get("fuelType")?.toString().trim() || "",
        insuranceStatus: fd.get("insuranceStatus")?.toString() || "Active",
        insuranceRenewal: fd.get("insuranceRenewal")?.toString() || "",
      },
    }));
  };

  const handleReminderAdd = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const title = fd.get("title")?.toString().trim();
    const dueDate = fd.get("dueDate")?.toString();
    if (!title || !dueDate) return;
    update((prev) => ({
      ...prev,
      reminders: [...prev.reminders, { id: uid("rem"), title, dueDate }],
    }));
    e.target.reset();
  };

  return (
    <Layout>
      <div className="content-wrapper">
        <main className="dashboard-main">
          <div className="stat-row">
            <StatCard
              index={0}
              label="Fuel Left"
              value={<><CountUp value={fuelLeft.pct} suffix="%" /></>}
              hint={fuelLeft.kmLeft ? `~${fuelLeft.kmLeft} km left` : "Log fuel to estimate"}
              progress={<AnimatedProgress value={fuelLeft.pct} delay={0.1} />}
            />
            <StatCard
              index={1}
              label="Upcoming Service"
              value={serviceDays !== null ? <><CountUp value={serviceDays} suffix=" Days" /></> : "—"}
              hint={next ? next.title : "No service scheduled"}
              progress={<AnimatedProgress value={serviceDays === null ? 0 : Math.max(8, 100 - serviceDays * 2)} colorClass="warning" delay={0.2} />}
            />
            <StatCard
              index={2}
              label="Insurance"
              value={insuranceDays !== null ? <><CountUp value={insuranceDays} suffix=" Days" /></> : "—"}
              hint={data.vehicle.insuranceRenewal ? `Renews ${formatDate(data.vehicle.insuranceRenewal)}` : "Set renewal date"}
              progress={<AnimatedProgress value={insuranceDays === null ? 0 : Math.max(8, (insuranceDays / 365) * 100)} delay={0.3} />}
            />
            <StatCard
              index={3}
              label="Total Expenses"
              value={<CountUp value={monthlyTotal} prefix="₹ " />}
              hint="This month"
              progress={<AnimatedSparkline points={trend.map((t) => t.total)} />}
            />
          </div>

          <div className="dash-grid-2">
            <AnimatedCard className="card vehicle-hero" index={4}>
              <div className="card-header">
                <h2>My Vehicle</h2>
              </div>
              <motion.div
                className={`vehicle-photo${data.vehicle.image ? " has-image" : ""}`}
                style={data.vehicle.image ? { backgroundImage: `linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6)), url(${data.vehicle.image})` } : undefined}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
              >
                <div>
                  <div className="vehicle-name">{data.vehicle.name}</div>
                  <div className="vehicle-plate">{data.vehicle.plate}</div>
                </div>
              </motion.div>
              <span className="badge-active">● {data.vehicle.insuranceStatus}</span>
            </AnimatedCard>

            <AnimatedCard className="card" index={5}>
              <div className="card-header">
                <h2>Monthly Overview</h2>
              </div>
              <div className="line-chart">
                <svg width="100%" height="140" viewBox="0 0 360 140">
                  <AnimatedLinePath d={monthlyChart.fuelPath} delay={0.2} />
                  <AnimatedLinePath d={monthlyChart.totalPath} stroke="#22c55e" strokeWidth={2} delay={0.5} />
                  {monthlyChart.lines.map((p) => (
                    <text key={p.label} x={p.x} y={135} textAnchor="middle" fill="#8b93a7" fontSize="11">{p.label}</text>
                  ))}
                </svg>
              </div>
              <div className="chart-legend">
                <div className="legend-item"><span className="swatch" style={{ background: "#c41e3a" }} />Fuel {money(fuelMonth, true)}</div>
                <div className="legend-item"><span className="swatch" style={{ background: "#22c55e" }} />Service {money(serviceMonth, true)}</div>
                <div className="legend-item"><span className="swatch" style={{ background: "#f59e0b" }} />Other {money(insuranceMonth, true)}</div>
              </div>
            </AnimatedCard>
          </div>

          <div className="dash-grid-2">
            <AnimatedCard className="card" index={6}>
              <div className="card-header">
                <h2>Recent Activity</h2>
                <Link to="/fuel">View all</Link>
              </div>
              <motion.div className="activity-list" variants={listStagger} initial="hidden" animate="show">
                {activities.length ? activities.map((ev) => (
                  <motion.div key={`${ev.type}-${ev.date}-${ev.title}`} className="activity-item" variants={listItem}>
                    <div className={`activity-icon ${ev.type}`}>{ev.icon}</div>
                    <div className="activity-body">
                      <strong>{ev.title}</strong>
                      <span>{ev.meta}</span>
                    </div>
                    <div className="activity-time">{formatDate(ev.date)}</div>
                  </motion.div>
                )) : <p className="empty">No recent activity yet.</p>}
              </motion.div>
            </AnimatedCard>

            <AnimatedCard className="card" index={7}>
              <div className="card-header">
                <h2>Fuel Efficiency</h2>
              </div>
              <div className="efficiency-head">
                <div>
                  <div className="efficiency-value">
                    {avgKmL ? <><CountUp value={avgKmL} decimals={1} suffix=" km/l" /></> : "—"}
                  </div>
                  <div className="subtext">Average Mileage</div>
                </div>
                <div className="efficiency-change">▲ 8.2% vs last month</div>
              </div>
              <div className="bar-chart">
                {efficiencies.length ? efficiencies.map((v, i) => {
                  const max = Math.max(...efficiencies, 1);
                  return <AnimatedBar key={i} heightPct={Math.max(8, (v / max) * 100)} delay={0.1 + i * 0.08} title={`${v.toFixed(1)} km/l`} />;
                }) : <p className="empty">Need 2+ fuel entries with mileage.</p>}
              </div>
            </AnimatedCard>
          </div>

          <AnimatedCard className="card section" index={8} id="documents">
            <h2>Document Vault</h2>
            <p className="subtext">Upload RC, insurance, PUC, or license files.</p>
            <div className="doc-grid">
              {data.documents.map((doc) => (
                <div key={doc.id} className="doc-item">
                  <div>
                    <strong>{doc.type}</strong>
                    <div className="meta">{doc.name || "Not uploaded"}</div>
                  </div>
                  <label className="doc-btn" style={{ cursor: "pointer" }}>
                    {doc.dataUrl ? "Replace" : "Upload"}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      hidden
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const dataUrl = await readFileAsDataUrl(file);
                        update((prev) => ({
                          ...prev,
                          documents: prev.documents.map((d) =>
                            d.id === doc.id ? { ...d, dataUrl, name: file.name } : d
                          ),
                        }));
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </AnimatedCard>

          <AnimatedCard className="card section" index={9} id="garage">
            <h2>Vehicle Profile</h2>
            <form onSubmit={handleVehicleSave}>
              <div className="form-grid">
                <div className="field">
                  <label>Vehicle name</label>
                  <input name="name" defaultValue={data.vehicle.name} />
                </div>
                <div className="field">
                  <label>Plate number</label>
                  <input name="plate" defaultValue={data.vehicle.plate} />
                </div>
                <div className="field">
                  <label>Mileage (km)</label>
                  <input name="mileage" type="number" defaultValue={data.vehicle.mileage} />
                </div>
                <div className="field">
                  <label>Fuel type</label>
                  <input name="fuelType" defaultValue={data.vehicle.fuelType} />
                </div>
                <div className="field">
                  <label>Insurance status</label>
                  <select name="insuranceStatus" defaultValue={data.vehicle.insuranceStatus}>
                    <option value="Active">Active</option>
                    <option value="Expired">Expired</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <div className="field">
                  <label>Insurance renewal</label>
                  <input name="insuranceRenewal" type="date" defaultValue={data.vehicle.insuranceRenewal} />
                </div>
              </div>
              <div className="submit-row">
                <button className="btn" type="submit">Save Profile</button>
              </div>
            </form>
          </AnimatedCard>

          <AnimatedCard className="card section" index={10} id="reminders">
            <h2>Manage Reminders</h2>
            <div className="reminder-grid">
              {data.reminders.map((r) => {
                const days = daysUntil(r.dueDate);
                const cls = days !== null && days <= 7 ? "warning-text" : "good-text";
                return (
                  <div key={r.id} className="reminder-item">
                    <div>
                      <strong>{r.title}</strong>
                      <div className="meta">{formatDate(r.dueDate)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span className={cls}>{days !== null ? `${days}d` : "—"}</span>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => update((prev) => ({
                          ...prev,
                          reminders: prev.reminders.filter((x) => x.id !== r.id),
                        }))}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={handleReminderAdd} style={{ marginTop: 14 }}>
              <div className="form-grid">
                <div className="field">
                  <label>Reminder</label>
                  <input name="title" placeholder="e.g. PUC expires" required />
                </div>
                <div className="field">
                  <label>Due date</label>
                  <input name="dueDate" type="date" required />
                </div>
              </div>
              <div className="submit-row">
                <button className="btn" type="submit">Add Reminder</button>
              </div>
            </form>
          </AnimatedCard>
        </main>

        <aside className="right-panel">
          <AnimatedCard className="card" index={3}>
            <div className="card-header">
              <h2>Reminders</h2>
            </div>
            <motion.div className="reminder-list" variants={listStagger} initial="hidden" animate="show">
              {sidebarReminders.map((r) => {
                const days = daysUntil(r.dueDate);
                const tagCls = days !== null && days <= 3 ? "urgent" : days !== null && days <= 14 ? "soon" : "ok";
                return (
                  <motion.div key={r.id} className="reminder-row" variants={listItem}>
                    <div className="r-icon">🔔</div>
                    <div className="r-body">
                      <strong>{r.title}</strong>
                      <span>{formatDate(r.dueDate)}</span>
                    </div>
                    <span className={`reminder-tag ${tagCls}`}>{days !== null ? `${Math.max(0, days)}d left` : "—"}</span>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatedCard>

          <AnimatedCard className="card" index={4} id="tyres">
            <div className="card-header"><h2>Vehicle Status</h2></div>
            <div className="tyre-diagram">
              <div className="car-outline" />
              {[
                { id: "fl", label: tp.fl, pos: "fl" },
                { id: "fr", label: tp.fr, pos: "fr" },
                { id: "rl", label: tp.rl, pos: "rl" },
                { id: "rr", label: tp.rr, pos: "rr" },
              ].map((t, i) => (
                <motion.div
                  key={t.id}
                  className={`tyre-node ${t.pos}`}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.1, type: "spring" }}
                >
                  <strong>{t.label} PSI</strong>
                  <span>Good</span>
                </motion.div>
              ))}
            </div>
            <button className="btn block secondary" type="button">Check Tyre Pressure</button>
          </AnimatedCard>

          <AnimatedCard className="card" index={5}>
            <div className="card-header"><h2>Quick Actions</h2></div>
            <div className="quick-grid">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link className="quick-btn" to="/fuel"><span className="q-icon">⛽</span>Add Fuel Entry</Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link className="quick-btn" to="/service"><span className="q-icon">🔧</span>Add Service</Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <a className="quick-btn" href="#documents"><span className="q-icon">📄</span>Upload Document</a>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <a className="quick-btn" href="#reminders"><span className="q-icon">🔔</span>Add Reminder</a>
              </motion.div>
            </div>
          </AnimatedCard>
        </aside>
      </div>

      <FabMenu />
    </Layout>
  );
}

function FabMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fab-menu show"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Link to="/fuel" onClick={() => setOpen(false)}>⛽ Add Fuel Entry</Link>
            <Link to="/service" onClick={() => setOpen(false)}>🔧 Add Service</Link>
            <a href="#documents" onClick={() => setOpen(false)}>📄 Upload Document</a>
            <a href="#reminders" onClick={() => setOpen(false)}>🔔 Add Reminder</a>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        className="fab"
        type="button"
        aria-label="Quick add"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        onClick={() => setOpen((v) => !v)}
      >
        +
      </motion.button>
    </>
  );
}
