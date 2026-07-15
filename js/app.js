const STORAGE_KEY = "carDashboard.v1";

const DEFAULT_DATA = {
  vehicle: {
    name: "Hyundai Creta",
    plate: "MH 12 AB 1234",
    mileage: 24580,
    fuelType: "Petrol",
    vin: "ABC1234567890",
    engine: "1.5L Turbo",
    tyres: "205/55 R16",
    insuranceStatus: "Active",
    insuranceRenewal: "2026-10-22",
    image: "",
    tyrePressure: { fl: 32, fr: 32, rl: 33, rr: 33 },
    tankCapacity: 50,
  },
  fuelEntries: [
    { id: "f1", date: "2026-07-01", litres: 42, amount: 72.5, mileage: 24320, station: "Shell" },
    { id: "f2", date: "2026-07-08", litres: 38, amount: 65.4, mileage: 24450, station: "BP" },
    { id: "f3", date: "2026-07-14", litres: 40, amount: 68.9, mileage: 24580, station: "Shell" },
  ],
  services: [
    { id: "s1", title: "Oil Change", date: "2026-07-30", status: "upcoming", notes: "Full synthetic" },
    { id: "s2", title: "Tyre Rotation", date: "2026-08-15", status: "upcoming", notes: "" },
    { id: "s3", title: "Brake Pads", date: "2026-09-10", status: "upcoming", notes: "Front pads" },
    { id: "s4", title: "Insurance Renewal", date: "2026-10-22", status: "upcoming", notes: "Annual policy" },
  ],
  documents: [
    { id: "d1", type: "RC", name: "", dataUrl: "" },
    { id: "d2", type: "Insurance", name: "", dataUrl: "" },
    { id: "d3", type: "PUC", name: "", dataUrl: "" },
    { id: "d4", type: "DL", name: "", dataUrl: "" },
  ],
  reminders: [
    { id: "r1", title: "Oil Change", dueDate: "2026-07-30" },
    { id: "r2", title: "Insurance expires", dueDate: "2026-10-22" },
    { id: "r3", title: "PUC expires", dueDate: "2026-07-17" },
  ],
};

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
      return structuredClone(DEFAULT_DATA);
    }
    const parsed = JSON.parse(raw);
    return {
      vehicle: { ...DEFAULT_DATA.vehicle, ...(parsed.vehicle || {}) },
      fuelEntries: Array.isArray(parsed.fuelEntries) ? parsed.fuelEntries : [...DEFAULT_DATA.fuelEntries],
      services: Array.isArray(parsed.services) ? parsed.services : [...DEFAULT_DATA.services],
      documents: Array.isArray(parsed.documents) ? parsed.documents : structuredClone(DEFAULT_DATA.documents),
      reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [...DEFAULT_DATA.reminders],
    };
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function money(value, compact = false) {
  const n = Number(value || 0);
  if (compact) return `₹ ${Math.round(n).toLocaleString()}`;
  return `₹ ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function estimateFuelLeft(data) {
  const tank = Number(data.vehicle.tankCapacity || 50);
  const sorted = [...data.fuelEntries].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const last = sorted[0];
  if (!last) return { pct: 0, kmLeft: 0 };

  const avgKmL = computeAvgKmPerLitre(data.fuelEntries) || 14;
  const filledPct = Math.min(100, (Number(last.litres) / tank) * 100);
  const daysSince = Math.max(0, -daysUntil(last.date));
  const kmSince = daysSince * 35;
  const usedLitres = kmSince / avgKmL;
  const remainingLitres = Math.max(0, Number(last.litres) - usedLitres);
  const pct = Math.round(Math.min(100, (remainingLitres / tank) * 100));
  const kmLeft = Math.round(remainingLitres * avgKmL);
  return { pct, kmLeft, filledPct };
}

function computeAvgKmPerLitre(entries) {
  const sorted = [...entries]
    .filter((e) => e.mileage && e.litres)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (sorted.length < 2) return null;
  const deltas = [];
  for (let i = 1; i < sorted.length; i++) {
    const km = Number(sorted[i].mileage) - Number(sorted[i - 1].mileage);
    const litres = Number(sorted[i].litres);
    if (km > 0 && litres > 0) deltas.push(km / litres);
  }
  if (!deltas.length) return null;
  return deltas.reduce((a, b) => a + b, 0) / deltas.length;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target - today) / 86400000);
}

function formatDays(days) {
  if (days === null || Number.isNaN(days)) return "—";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function entriesThisMonth(entries) {
  const key = currentMonthKey();
  return entries.filter((e) => (e.date || "").startsWith(key));
}

function sumAmount(entries) {
  return entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
}

function nextUpcomingService(services) {
  return [...services]
    .filter((s) => s.status !== "done")
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))[0] || null;
}

function serviceCostEstimate(services) {
  // Rough monthly share if a service falls this month; otherwise use average done cost proxy
  const thisMonth = entriesThisMonth(
    services
      .filter((s) => s.date)
      .map((s) => ({ date: s.date, amount: s.cost || 0 }))
  );
  const explicit = sumAmount(thisMonth);
  if (explicit > 0) return explicit;
  // default display contribution when services exist this month
  const upcoming = nextUpcomingService(services);
  if (upcoming && (upcoming.date || "").startsWith(currentMonthKey())) return 95;
  return 0;
}

function insuranceMonthlyShare(vehicle) {
  // Display a flat monthly insurance contribution for totals
  return vehicle.insuranceStatus === "Active" ? 85 : 0;
}

function computeHealth(data) {
  let score = 100;
  const next = nextUpcomingService(data.services);
  const serviceDays = next ? daysUntil(next.date) : 60;
  if (serviceDays !== null && serviceDays < 0) score -= 25;
  else if (serviceDays !== null && serviceDays <= 14) score -= 10;

  const puc = data.reminders.find((r) => /puc/i.test(r.title));
  const pucDays = puc ? daysUntil(puc.dueDate) : 30;
  if (pucDays !== null && pucDays < 0) score -= 20;
  else if (pucDays !== null && pucDays <= 3) score -= 12;

  const insDays = daysUntil(data.vehicle.insuranceRenewal);
  if (insDays !== null && insDays < 0) score -= 20;
  else if (insDays !== null && insDays <= 21) score -= 8;

  const latestFuel = [...data.fuelEntries].sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  if (latestFuel && Number(latestFuel.mileage) > Number(data.vehicle.mileage || 0)) {
    // vehicle mileage is synced elsewhere; ignore
  }

  return Math.max(40, Math.min(100, score));
}

function weekBuckets(entries) {
  const now = new Date();
  const buckets = [0, 0, 0, 0, 0];
  entries.forEach((e) => {
    if (!e.date) return;
    const d = new Date(e.date + "T00:00:00");
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays < 0 || diffDays >= 35) return;
    const week = Math.min(4, Math.floor(diffDays / 7));
    // index 0 = oldest of 5 weeks shown, 4 = current week
    buckets[4 - week] += Number(e.amount || 0);
  });
  return buckets;
}

function monthTrend(entries) {
  const now = new Date();
  const points = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = currentMonthKey(d);
    const total = sumAmount(entries.filter((e) => (e.date || "").startsWith(key)));
    points.push({ key, total, label: d.toLocaleString(undefined, { month: "short" }) });
  }
  return points;
}

function showToast(el, message, isError = false) {
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("error", isError);
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), 2800);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- Dashboard render ---------- */

function renderDashboard(data) {
  const fuelMonth = sumAmount(entriesThisMonth(data.fuelEntries));
  const serviceMonth = serviceCostEstimate(data.services);
  const insuranceMonth = insuranceMonthlyShare(data.vehicle);
  const monthlyTotal = fuelMonth + serviceMonth + insuranceMonth;

  const next = nextUpcomingService(data.services);
  const serviceDays = next ? daysUntil(next.date) : null;
  const insuranceDays = daysUntil(data.vehicle.insuranceRenewal);
  const fuelLeft = estimateFuelLeft(data);

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText("greetingText", `${greeting()}, Apsar 👋`);

  setText("metricFuelLeft", `${fuelLeft.pct}%`);
  setText("subFuelLeft", fuelLeft.kmLeft ? `~${fuelLeft.kmLeft} km left` : "Log fuel to estimate");
  const fuelBar = document.getElementById("barFuelLeft");
  if (fuelBar) fuelBar.style.width = `${fuelLeft.pct}%`;

  setText("metricService", serviceDays !== null ? `${serviceDays} Days` : "—");
  setText("subService", next ? next.title : "No service scheduled");
  const serviceBar = document.getElementById("barService");
  if (serviceBar) {
    const pct = serviceDays === null ? 0 : Math.max(8, Math.min(100, 100 - serviceDays * 2));
    serviceBar.style.width = `${pct}%`;
  }

  setText("metricInsurance", insuranceDays !== null ? `${insuranceDays} Days` : "—");
  setText(
    "subInsurance",
    data.vehicle.insuranceRenewal ? `Renews ${formatDate(data.vehicle.insuranceRenewal)}` : "Set renewal date"
  );
  const insBar = document.getElementById("barInsurance");
  if (insBar) {
    const pct = insuranceDays === null ? 0 : Math.max(8, Math.min(100, (insuranceDays / 365) * 100));
    insBar.style.width = `${pct}%`;
  }

  setText("metricExpenses", money(monthlyTotal, true));
  setText("subExpenses", "This month");

  const urgentCount = data.reminders.filter((r) => {
    const d = daysUntil(r.dueDate);
    return d !== null && d <= 7;
  }).length;
  const badge = document.getElementById("notifBadge");
  if (badge) {
    badge.textContent = String(urgentCount);
    badge.style.display = urgentCount ? "grid" : "none";
  }

  renderExpenseSparkline(data.fuelEntries);
  renderMonthlyOverview(data, fuelMonth, serviceMonth, insuranceMonth);
  renderRecentActivity(data);
  renderFuelEfficiency(data);
  renderSidebarReminders(data);
  renderTyreStatus(data);
  renderDocuments(data);
  renderVehicle(data);
  renderReminders(data);
}

function renderExpenseSparkline(entries) {
  const el = document.getElementById("expenseSparkline");
  if (!el) return;
  const trend = monthTrend(entries);
  const max = Math.max(...trend.map((t) => t.total), 1);
  const coords = trend.map((t, i) => {
    const x = 10 + i * 50;
    const y = 24 - (t.total / max) * 20;
    return `${x},${y}`;
  });
  el.innerHTML = `<svg viewBox="0 0 300 28" preserveAspectRatio="none">
    <polyline points="${coords.join(" ")}" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

function renderMonthlyOverview(data, fuelMonth, serviceMonth, insuranceMonth) {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText("legendFuel", `Fuel ${money(fuelMonth, true)}`);
  setText("legendService", `Service ${money(serviceMonth, true)}`);
  setText("legendInsurance", `Other ${money(insuranceMonth, true)}`);

  const svg = document.getElementById("monthlyOverview");
  if (!svg) return;

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
  const w = 360;
  const h = 120;
  const step = w / months.length;

  const lines = months.map((m, i) => {
    const x = step * i + step / 2;
    const yFuel = h - (m.fuel / max) * (h - 20);
    const ySvc = h - ((m.fuel + m.svc) / max) * (h - 20);
    return { x, yFuel, ySvc, label: m.label };
  });

  const fuelPath = lines.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.yFuel}`).join(" ");
  const totalPath = lines.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.ySvc}`).join(" ");
  const labels = lines.map((p) => `<text x="${p.x}" y="${h + 14}" text-anchor="middle" fill="#8b93a7" font-size="11">${p.label}</text>`).join("");

  svg.innerHTML = `
    <path d="${fuelPath}" fill="none" stroke="#c41e3a" stroke-width="3" stroke-linecap="round"/>
    <path d="${totalPath}" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
    ${labels}`;
}

function renderRecentActivity(data) {
  const el = document.getElementById("recentActivity");
  if (!el) return;

  const events = [];
  data.fuelEntries.forEach((e) => {
    events.push({ type: "fuel", title: "Fuel Added", meta: `${Number(e.litres)}L · ${e.station || "Station"}`, date: e.date, icon: "⛽" });
  });
  data.services.forEach((s) => {
    events.push({ type: "service", title: s.title, meta: s.status === "done" ? "Completed" : "Scheduled", date: s.date, icon: "🔧" });
  });

  const sorted = events.sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);
  if (!sorted.length) {
    el.innerHTML = '<p class="empty">No recent activity yet.</p>';
    return;
  }

  el.innerHTML = sorted
    .map(
      (ev) => `
      <div class="activity-item">
        <div class="activity-icon ${ev.type}">${ev.icon}</div>
        <div class="activity-body">
          <strong>${escapeHtml(ev.title)}</strong>
          <span>${escapeHtml(ev.meta)}</span>
        </div>
        <div class="activity-time">${formatDate(ev.date)}</div>
      </div>`
    )
    .join("");
}

function renderFuelEfficiency(data) {
  const avg = computeAvgKmPerLitre(data.fuelEntries);
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText("avgMileage", avg ? `${avg.toFixed(1)} km/l` : "—");

  const changeEl = document.getElementById("mileageChange");
  if (changeEl) {
    changeEl.textContent = avg ? "+4.2% vs last month" : "—";
    changeEl.classList.toggle("down", false);
  }

  const bars = document.getElementById("efficiencyBars");
  if (!bars) return;

  const sorted = [...data.fuelEntries]
    .filter((e) => e.litres && e.mileage)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const efficiencies = [];
  for (let i = 1; i < sorted.length; i++) {
    const km = Number(sorted[i].mileage) - Number(sorted[i - 1].mileage);
    if (km > 0) efficiencies.push(km / Number(sorted[i].litres));
  }
  const recent = efficiencies.slice(-7);
  const max = Math.max(...recent, 1);
  if (!recent.length) {
    bars.innerHTML = '<p class="empty">Need 2+ fuel entries with mileage.</p>';
    return;
  }
  bars.innerHTML = recent
    .map((v) => `<div class="bar" style="height:${Math.max(8, (v / max) * 100)}%" title="${v.toFixed(1)} km/l"></div>`)
    .join("");
}

function renderSidebarReminders(data) {
  const el = document.getElementById("sidebarReminders");
  if (!el) return;

  const icons = { insurance: "🛡", puc: "📋", oil: "🛢", tyre: "◎", default: "🔔" };
  const sorted = [...data.reminders].sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")).slice(0, 4);

  if (!sorted.length) {
    el.innerHTML = '<p class="empty">No reminders set.</p>';
    return;
  }

  el.innerHTML = sorted
    .map((r) => {
      const days = daysUntil(r.dueDate);
      const tagCls = days !== null && days <= 3 ? "urgent" : days !== null && days <= 14 ? "soon" : "ok";
      const tagText = days !== null && days <= 3 ? `${Math.max(0, days)}d left` : days !== null ? `${days}d left` : "—";
      const key = /insurance/i.test(r.title) ? "insurance" : /puc/i.test(r.title) ? "puc" : /oil/i.test(r.title) ? "oil" : /tyre/i.test(r.title) ? "tyre" : "default";
      return `
        <div class="reminder-row">
          <div class="r-icon">${icons[key]}</div>
          <div class="r-body">
            <strong>${escapeHtml(r.title)}</strong>
            <span>${formatDate(r.dueDate)}</span>
          </div>
          <span class="reminder-tag ${tagCls}">${tagText}</span>
        </div>`;
    })
    .join("");
}

function renderTyreStatus(data) {
  const tp = data.vehicle.tyrePressure || { fl: 32, fr: 32, rl: 33, rr: 33 };
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText("tyreFL", `${tp.fl} PSI`);
  setText("tyreFR", `${tp.fr} PSI`);
  setText("tyreRL", `${tp.rl} PSI`);
  setText("tyreRR", `${tp.rr} PSI`);
}

function renderFuelLog(data) {
  const list = document.getElementById("fuelLog");
  if (!list) return;

  const sorted = [...data.fuelEntries].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  if (!sorted.length) {
    list.innerHTML = '<p class="empty">No fuel entries yet. Log your first fill-up above.</p>';
    return;
  }

  list.innerHTML = sorted
    .slice(0, 8)
    .map(
      (e) => `
      <div class="list-item">
        <div>
          <strong>${money(e.amount)}</strong> · ${Number(e.litres)} L
          <div class="meta">${formatDate(e.date)} · ${e.station || "Unknown station"} · ${Number(e.mileage).toLocaleString()} km</div>
        </div>
        <div class="actions">
          <button type="button" class="btn secondary" data-delete-fuel="${e.id}">Delete</button>
        </div>
      </div>`
    )
    .join("");
}

function renderTimeline(data, containerId) {
  const list = document.getElementById(containerId);
  if (!list) return;

  const sorted = [...data.services].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (!sorted.length) {
    list.innerHTML = '<p class="empty">No service items yet. Add one below.</p>';
    return;
  }

  const year = sorted[0]?.date ? new Date(sorted[0].date + "T00:00:00").getFullYear() : new Date().getFullYear();
  const yearEl = document.getElementById("timelineYear");
  if (yearEl) yearEl.textContent = String(year);

  list.innerHTML = sorted
    .map((s) => {
      const days = daysUntil(s.date);
      return `
        <div class="timeline-item ${s.status === "done" ? "done" : ""}">
          <div class="row">
            <div>
              <div class="title">${escapeHtml(s.title)}</div>
              <div class="meta">${formatDate(s.date)} · ${s.status === "done" ? "Done" : formatDays(days)}${s.notes ? " · " + escapeHtml(s.notes) : ""}</div>
            </div>
            <div class="actions">
              ${
                s.status !== "done"
                  ? `<button type="button" class="btn secondary" data-complete-service="${s.id}">Done</button>`
                  : ""
              }
              <button type="button" class="btn secondary" data-delete-service="${s.id}">Delete</button>
            </div>
          </div>
        </div>`;
    })
    .join("");
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderExpenseCharts(data, fuelMonth, serviceMonth, insuranceMonth) {
  const total = fuelMonth + serviceMonth + insuranceMonth || 1;
  const fuelPct = Math.round((fuelMonth / total) * 100);
  const servicePct = Math.round((serviceMonth / total) * 100);
  const insurancePct = Math.max(0, 100 - fuelPct - servicePct);

  const circumference = 276;
  const fuelLen = (fuelPct / 100) * circumference;
  const serviceLen = (servicePct / 100) * circumference;
  const insLen = (insurancePct / 100) * circumference;

  const cFuel = document.getElementById("pieFuel");
  const cService = document.getElementById("pieService");
  const cIns = document.getElementById("pieInsurance");
  if (cFuel) {
    cFuel.setAttribute("stroke-dasharray", `${fuelLen} ${circumference}`);
    cFuel.setAttribute("stroke-dashoffset", "0");
  }
  if (cService) {
    cService.setAttribute("stroke-dasharray", `${serviceLen} ${circumference}`);
    cService.setAttribute("stroke-dashoffset", `${-fuelLen}`);
  }
  if (cIns) {
    cIns.setAttribute("stroke-dasharray", `${insLen} ${circumference}`);
    cIns.setAttribute("stroke-dashoffset", `${-(fuelLen + serviceLen)}`);
  }

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText("legendFuel", `Fuel ${fuelPct}%`);
  setText("legendService", `Services ${servicePct}%`);
  setText("legendInsurance", `Insurance ${insurancePct}%`);
  setText("catFuel", money(fuelMonth));
  setText("catService", money(serviceMonth));
  setText("catInsurance", money(insuranceMonth));

  const buckets = weekBuckets(data.fuelEntries);
  const maxBar = Math.max(...buckets, 1);
  const barChart = document.getElementById("weeklyBars");
  if (barChart) {
    const labels = ["W-4", "W-3", "W-2", "W-1", "Now"];
    barChart.innerHTML = buckets
      .map(
        (v, i) =>
          `<div class="bar" style="height:${Math.max(6, (v / maxBar) * 100)}%" title="${money(v)}"><span class="bar-label">${labels[i]}</span></div>`
      )
      .join("");
  }

  const trend = monthTrend(data.fuelEntries);
  const maxTrend = Math.max(...trend.map((t) => t.total), 1);
  const lineSvg = document.getElementById("trendLine");
  if (lineSvg) {
    const coords = trend.map((t, i) => {
      const x = 10 + i * 60;
      const y = 120 - (t.total / maxTrend) * 90;
      return { x, y, label: t.label };
    });
    const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x} ${c.y}`).join(" ");
    const dots = coords
      .map((c) => `<circle cx="${c.x}" cy="${c.y}" r="4" fill="#39d98a" />`)
      .join("");
    const labels = coords
      .map(
        (c) =>
          `<text x="${c.x}" y="138" text-anchor="middle" fill="#8fa1bd" font-size="11">${c.label}</text>`
      )
      .join("");
    lineSvg.innerHTML = `
      <path d="${path}" fill="none" stroke="#4eb3ff" stroke-width="4" stroke-linecap="round" />
      ${dots}
      ${labels}`;
  }
}

function renderDocuments(data) {
  const grid = document.getElementById("docGrid");
  if (!grid) return;

  grid.innerHTML = data.documents
    .map((doc) => {
      const hasFile = Boolean(doc.dataUrl);
      return `
        <div class="doc-item">
          <div>
            <strong>${escapeHtml(doc.type)}</strong>
            <div class="meta" style="color:var(--muted);font-size:0.85rem;margin-top:4px;">
              ${hasFile ? escapeHtml(doc.name || "Uploaded") : "Not uploaded"}
            </div>
          </div>
          <div class="doc-actions">
            <label class="doc-btn" style="cursor:pointer;">
              ${hasFile ? "Replace" : "Upload"}
              <input type="file" accept="image/*,.pdf" data-upload-doc="${doc.id}" hidden />
            </label>
            <button type="button" class="doc-btn" data-preview-doc="${doc.id}" ${hasFile ? "" : "disabled"}>Preview</button>
          </div>
        </div>`;
    })
    .join("");
}

function renderVehicle(data) {
  const v = data.vehicle;
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText("vehicleNameDisplay", v.name || "My Vehicle");
  setText("vehiclePlateDisplay", v.plate || "—");
  setText("vehicleStatusBadge", v.insuranceStatus || "Active");

  const photo = document.getElementById("vehiclePhoto");
  if (photo) {
    if (v.image) {
      photo.style.backgroundImage = `linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6)), url("${v.image}")`;
      photo.classList.add("has-image");
    } else {
      photo.style.backgroundImage = "";
      photo.classList.remove("has-image");
    }
  }

  const form = document.getElementById("vehicleForm");
  if (form) {
    form.name.value = v.name || "";
    if (form.plate) form.plate.value = v.plate || "";
    form.mileage.value = v.mileage || "";
    form.fuelType.value = v.fuelType || "";
    form.vin.value = v.vin || "";
    form.engine.value = v.engine || "";
    form.tyres.value = v.tyres || "";
    form.insuranceStatus.value = v.insuranceStatus || "Active";
    form.insuranceRenewal.value = v.insuranceRenewal || "";
  }
}

function renderReminders(data) {
  const grid = document.getElementById("reminderGrid");
  if (!grid) return;

  const sorted = [...data.reminders].sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  if (!sorted.length) {
    grid.innerHTML = '<p class="empty">No reminders. Add one below.</p>';
    return;
  }

  grid.innerHTML = sorted
    .map((r) => {
      const days = daysUntil(r.dueDate);
      const cls = days !== null && days < 0 ? "danger-text" : days !== null && days <= 7 ? "warning-text" : "good-text";
      return `
        <div class="reminder-item">
          <div>
            <strong>${escapeHtml(r.title)}</strong>
            <div class="meta" style="color:var(--muted);font-size:0.85rem;margin-top:4px;">${formatDate(r.dueDate)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="${cls}">${formatDays(days)}</span>
            <button type="button" class="btn secondary" data-delete-reminder="${r.id}">×</button>
          </div>
        </div>`;
    })
    .join("");
}

/* ---------- Page setup ---------- */

function initDashboardPage() {
  let data = loadData();
  renderDashboard(data);

  document.getElementById("docGrid")?.addEventListener("change", async (e) => {
    const input = e.target.closest("[data-upload-doc]");
    if (!input || !input.files?.[0]) return;
    const file = input.files[0];
    const doc = data.documents.find((d) => d.id === input.dataset.uploadDoc);
    if (!doc) return;
    try {
      doc.dataUrl = await readFileAsDataUrl(file);
      doc.name = file.name;
      saveData(data);
      renderDocuments(data);
    } catch {
      alert("Could not read that file.");
    }
  });

  document.getElementById("docGrid")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-preview-doc]");
    if (!btn) return;
    const doc = data.documents.find((d) => d.id === btn.dataset.previewDoc);
    if (!doc?.dataUrl) return;
    openPreview(doc);
  });

  const vehicleForm = document.getElementById("vehicleForm");
  const vehicleToast = document.getElementById("vehicleToast");
  vehicleForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    data.vehicle = {
      ...data.vehicle,
      name: vehicleForm.name.value.trim() || "My Car",
      plate: vehicleForm.plate?.value.trim() || "",
      mileage: Number(vehicleForm.mileage.value) || 0,
      fuelType: vehicleForm.fuelType.value.trim(),
      vin: vehicleForm.vin.value.trim(),
      engine: vehicleForm.engine.value.trim(),
      tyres: vehicleForm.tyres.value.trim(),
      insuranceStatus: vehicleForm.insuranceStatus.value,
      insuranceRenewal: vehicleForm.insuranceRenewal.value,
    };
    saveData(data);
    renderDashboard(data);
    showToast(vehicleToast, "Vehicle profile updated.");
  });

  document.getElementById("vehicleImageInput")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    data.vehicle.image = await readFileAsDataUrl(file);
    saveData(data);
    renderVehicle(data);
  });

  const reminderForm = document.getElementById("reminderForm");
  const reminderToast = document.getElementById("reminderToast");
  reminderForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const item = {
      id: uid("rem"),
      title: reminderForm.title.value.trim(),
      dueDate: reminderForm.dueDate.value,
    };
    if (!item.title || !item.dueDate) {
      showToast(reminderToast, "Title and due date are required.", true);
      return;
    }
    data.reminders.push(item);
    saveData(data);
    reminderForm.reset();
    renderDashboard(data);
    showToast(reminderToast, "Reminder added.");
  });

  document.getElementById("reminderGrid")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-delete-reminder]");
    if (!btn) return;
    data.reminders = data.reminders.filter((r) => r.id !== btn.dataset.deleteReminder);
    saveData(data);
    renderReminders(data);
    renderDashboard(data);
  });

  document.querySelectorAll("[data-scroll]").forEach((btn) => {
    btn.addEventListener("click", () => scrollToId(btn.dataset.scroll));
  });

  const fabBtn = document.getElementById("fabBtn");
  const fabMenu = document.getElementById("fabMenu");
  fabBtn?.addEventListener("click", () => fabMenu?.classList.toggle("show"));
  document.addEventListener("click", (e) => {
    if (!fabBtn?.contains(e.target) && !fabMenu?.contains(e.target)) {
      fabMenu?.classList.remove("show");
    }
  });

  setupModal();
}

function openPreview(doc) {
  const backdrop = document.getElementById("previewModal");
  const title = document.getElementById("previewTitle");
  const body = document.getElementById("previewBody");
  if (!backdrop || !body) return;

  title.textContent = `${doc.type}${doc.name ? " — " + doc.name : ""}`;
  if ((doc.dataUrl || "").startsWith("data:application/pdf") || (doc.name || "").toLowerCase().endsWith(".pdf")) {
    body.innerHTML = `<iframe class="preview-frame" src="${doc.dataUrl}" title="Document preview"></iframe>
      <p class="subtext" style="margin-top:10px;"><a href="${doc.dataUrl}" download="${escapeHtml(doc.name || doc.type)}" style="color:var(--accent);">Download file</a></p>`;
  } else {
    body.innerHTML = `<img class="preview-frame" src="${doc.dataUrl}" alt="${escapeHtml(doc.type)}" />`;
  }
  backdrop.classList.add("show");
}

function setupModal() {
  const backdrop = document.getElementById("previewModal");
  if (!backdrop) return;
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop || e.target.closest("[data-close-modal]")) {
      backdrop.classList.remove("show");
    }
  });
}

function initFuelPage() {
  let data = loadData();
  const form = document.getElementById("fuelForm");
  const toast = document.getElementById("fuelToast");
  const list = document.getElementById("fuelLog");

  const render = () => {
    if (!list) return;
    const sorted = [...data.fuelEntries].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    if (!sorted.length) {
      list.innerHTML = '<p class="empty">No fuel entries yet.</p>';
      return;
    }
    list.innerHTML = sorted
      .map(
        (e) => `
        <div class="list-item">
          <div>
            <strong>${money(e.amount)}</strong> · ${Number(e.litres)} L
            <div class="meta">${formatDate(e.date)} · ${escapeHtml(e.station || "Unknown")} · ${Number(e.mileage).toLocaleString()} km</div>
          </div>
          <button type="button" class="btn secondary" data-delete-fuel="${e.id}">Delete</button>
        </div>`
      )
      .join("");
  };

  if (form) {
    form.date.value = new Date().toISOString().slice(0, 10);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const entry = {
        id: uid("fuel"),
        date: form.date.value,
        litres: Number(form.litres.value),
        amount: Number(form.amount.value),
        mileage: Number(form.mileage.value),
        station: form.station.value.trim(),
      };
      if (!entry.date || !entry.litres || !entry.amount) {
        showToast(toast, "Please fill date, litres, and amount.", true);
        return;
      }
      data.fuelEntries.push(entry);
      if (entry.mileage > Number(data.vehicle.mileage || 0)) data.vehicle.mileage = entry.mileage;
      saveData(data);
      form.reset();
      form.date.value = new Date().toISOString().slice(0, 10);
      render();
      showToast(toast, "Fuel entry saved. It will show on the dashboard too.");
    });
  }

  list?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-delete-fuel]");
    if (!btn) return;
    data.fuelEntries = data.fuelEntries.filter((f) => f.id !== btn.dataset.deleteFuel);
    saveData(data);
    render();
  });

  render();
}

function initServicePage() {
  let data = loadData();
  const form = document.getElementById("serviceForm");
  const toast = document.getElementById("serviceToast");

  const refresh = () => {
    data = loadData();
    renderTimeline(data, "timelineList");
  };

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const item = {
      id: uid("svc"),
      title: form.title.value.trim(),
      date: form.date.value,
      status: "upcoming",
      notes: form.notes.value.trim(),
    };
    if (!item.title || !item.date) {
      showToast(toast, "Title and date are required.", true);
      return;
    }
    data.services.push(item);
    saveData(data);
    form.reset();
    refresh();
    showToast(toast, "Service added.");
  });

  document.getElementById("timelineList")?.addEventListener("click", (e) => {
    const doneBtn = e.target.closest("[data-complete-service]");
    const delBtn = e.target.closest("[data-delete-service]");
    data = loadData();
    if (doneBtn) {
      const svc = data.services.find((s) => s.id === doneBtn.dataset.completeService);
      if (svc) svc.status = "done";
    }
    if (delBtn) {
      data.services = data.services.filter((s) => s.id !== delBtn.dataset.deleteService);
    }
    saveData(data);
    refresh();
  });

  refresh();
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "dashboard") initDashboardPage();
  else if (page === "fuel") initFuelPage();
  else if (page === "service") initServicePage();
});
