import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout, { PageWrapper } from "../components/Layout";
import AnimatedCard from "../components/AnimatedCard";
import { useData } from "../context/DataContext";
import { daysUntil, formatDate, formatDays, uid } from "../lib/data";

export default function ServiceHistory() {
  const { data, update } = useData();
  const [toast, setToast] = useState("");

  const sorted = [...data.services].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const year = sorted[0]?.date ? new Date(sorted[0].date + "T00:00:00").getFullYear() : new Date().getFullYear();

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(""), 2800);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const item = {
      id: uid("svc"),
      title: fd.get("title")?.toString().trim(),
      date: fd.get("date")?.toString(),
      status: "upcoming",
      notes: fd.get("notes")?.toString().trim() || "",
    };
    if (!item.title || !item.date) {
      showToast("Title and date are required.", true);
      return;
    }
    update((prev) => ({ ...prev, services: [...prev.services, item] }));
    e.target.reset();
    showToast("Service added.");
  };

  return (
    <Layout title="Service History" subtitle="Track maintenance and mark items complete.">
      <PageWrapper>
        <AnimatedCard className="card" index={0}>
          <div className="year">{year}</div>
          <div className="timeline">
            <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
              {sorted.length ? sorted.map((s) => {
                const days = daysUntil(s.date);
                return (
                  <motion.div
                    key={s.id}
                    className={`timeline-item${s.status === "done" ? " done" : ""}`}
                    variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
                    layout
                  >
                    <div className="row">
                      <div>
                        <div className="title">{s.title}</div>
                        <div className="meta">
                          {formatDate(s.date)} · {s.status === "done" ? "Done" : formatDays(days)}
                          {s.notes ? ` · ${s.notes}` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {s.status !== "done" && (
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() => update((prev) => ({
                              ...prev,
                              services: prev.services.map((x) =>
                                x.id === s.id ? { ...x, status: "done" } : x
                              ),
                            }))}
                          >
                            Done
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() => update((prev) => ({
                            ...prev,
                            services: prev.services.filter((x) => x.id !== s.id),
                          }))}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              }) : <p className="empty">No service items yet.</p>}
            </motion.div>
          </div>

          <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
            <div className="form-grid">
              <div className="field">
                <label>Service title</label>
                <input name="title" placeholder="e.g. Oil Change" required />
              </div>
              <div className="field">
                <label>Due date</label>
                <input name="date" type="date" required />
              </div>
              <div className="field full">
                <label>Notes</label>
                <input name="notes" placeholder="optional" />
              </div>
            </div>
            <div className="submit-row">
              <button className="btn" type="submit">Add Service</button>
              <Link className="btn secondary" to="/">Back to Dashboard</Link>
            </div>
            {toast && <div className={`toast show${toast.isError ? " error" : ""}`}>{toast.msg}</div>}
          </form>
        </AnimatedCard>
      </PageWrapper>
    </Layout>
  );
}
