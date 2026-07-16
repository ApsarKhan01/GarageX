import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout, { PageWrapper } from "../components/Layout";
import AnimatedCard from "../components/AnimatedCard";
import { useData } from "../context/DataContext";
import { formatDate, money, uid } from "../lib/data";

export default function FuelTracker() {
  const { data, update } = useData();
  const [toast, setToast] = useState("");

  const sorted = [...data.fuelEntries].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(""), 2800);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const entry = {
      id: uid("fuel"),
      date: fd.get("date"),
      litres: Number(fd.get("litres")),
      amount: Number(fd.get("amount")),
      mileage: Number(fd.get("mileage")),
      station: fd.get("station")?.toString().trim() || "",
    };
    if (!entry.date || !entry.litres || !entry.amount) {
      showToast("Please fill date, litres, and amount.", true);
      return;
    }
    update((prev) => {
      const next = { ...prev, fuelEntries: [...prev.fuelEntries, entry] };
      if (entry.mileage > Number(prev.vehicle.mileage || 0)) {
        next.vehicle = { ...prev.vehicle, mileage: entry.mileage };
      }
      return next;
    });
    e.target.reset();
    e.target.date.value = new Date().toISOString().slice(0, 10);
    showToast("Fuel entry saved.");
  };

  return (
    <Layout title="Fuel Tracker" subtitle="Log fill-ups — they sync with your dashboard.">
      <PageWrapper>
        <AnimatedCard className="card" index={0}>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label>Date</label>
                <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
              </div>
              <div className="field">
                <label>Litres</label>
                <input name="litres" type="number" step="0.01" min="0" placeholder="e.g. 37" required />
              </div>
              <div className="field">
                <label>Amount (₹)</label>
                <input name="amount" type="number" step="0.01" min="0" placeholder="e.g. 2500" required />
              </div>
              <div className="field">
                <label>Mileage (km)</label>
                <input name="mileage" type="number" min="0" placeholder="e.g. 12540" />
              </div>
              <div className="field full">
                <label>Fuel Station</label>
                <input name="station" placeholder="e.g. Shell, BP" />
              </div>
            </div>
            <div className="submit-row">
              <button className="btn" type="submit">Save Fuel Entry</button>
              <Link className="btn secondary" to="/">Back to Dashboard</Link>
            </div>
            {toast && <div className={`toast show${toast.isError ? " error" : ""}`}>{toast.msg}</div>}
          </form>
        </AnimatedCard>

        <AnimatedCard className="card" index={1} style={{ marginTop: 18 }}>
          <h2>All Fuel Entries</h2>
          <motion.div className="list" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }}>
            {sorted.length ? sorted.map((e) => (
              <motion.div
                key={e.id}
                className="list-item"
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                layout
              >
                <div>
                  <strong>{money(e.amount)}</strong> · {Number(e.litres)} L
                  <div className="meta">{formatDate(e.date)} · {e.station || "Unknown"} · {Number(e.mileage).toLocaleString()} km</div>
                </div>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => update((prev) => ({
                    ...prev,
                    fuelEntries: prev.fuelEntries.filter((f) => f.id !== e.id),
                  }))}
                >
                  Delete
                </button>
              </motion.div>
            )) : <p className="empty">No fuel entries yet.</p>}
          </motion.div>
        </AnimatedCard>
      </PageWrapper>
    </Layout>
  );
}
