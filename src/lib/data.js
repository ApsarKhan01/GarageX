export const STORAGE_KEY = "carDashboard.v1";

export const DEFAULT_DATA = {
  vehicle: {
    name: "Hyundai Creta SX(O)",
    plate: "KA 03 MK 2023",
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
    { id: "f1", date: "2026-07-01", litres: 42, amount: 2500, mileage: 24320, station: "Shell" },
    { id: "f2", date: "2026-07-08", litres: 38, amount: 2300, mileage: 24450, station: "BP" },
    { id: "f3", date: "2026-07-14", litres: 37, amount: 2200, mileage: 24580, station: "Shell" },
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
    { id: "r1", title: "Insurance Expiring", dueDate: "2026-10-22" },
    { id: "r2", title: "Service Due", dueDate: "2026-07-30" },
    { id: "r3", title: "PUC Expiring", dueDate: "2026-07-17" },
    { id: "r4", title: "Tyre Rotation", dueDate: "2026-08-15" },
  ],
};

export function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function loadData() {
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

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function money(value, compact = false) {
  const n = Number(value || 0);
  if (compact) return `₹ ${Math.round(n).toLocaleString()}`;
  return `₹ ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target - today) / 86400000);
}

export function formatDays(days) {
  if (days === null || Number.isNaN(days)) return "—";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function entriesThisMonth(entries) {
  const key = currentMonthKey();
  return entries.filter((e) => (e.date || "").startsWith(key));
}

export function sumAmount(entries) {
  return entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
}

export function nextUpcomingService(services) {
  return [...services]
    .filter((s) => s.status !== "done")
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))[0] || null;
}

export function serviceCostEstimate(services) {
  const thisMonth = entriesThisMonth(
    services.filter((s) => s.date).map((s) => ({ date: s.date, amount: s.cost || 0 }))
  );
  const explicit = sumAmount(thisMonth);
  if (explicit > 0) return explicit;
  const upcoming = nextUpcomingService(services);
  if (upcoming && (upcoming.date || "").startsWith(currentMonthKey())) return 3500;
  return 0;
}

export function insuranceMonthlyShare(vehicle) {
  return vehicle.insuranceStatus === "Active" ? 4200 : 0;
}

export function computeAvgKmPerLitre(entries) {
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

export function estimateFuelLeft(data) {
  const tank = Number(data.vehicle.tankCapacity || 50);
  const sorted = [...data.fuelEntries].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const last = sorted[0];
  if (!last) return { pct: 0, kmLeft: 0 };

  const avgKmL = computeAvgKmPerLitre(data.fuelEntries) || 16.8;
  const daysSince = Math.max(0, -daysUntil(last.date));
  const kmSince = daysSince * 35;
  const usedLitres = kmSince / avgKmL;
  const remainingLitres = Math.max(0, Number(last.litres) - usedLitres);
  const pct = Math.round(Math.min(100, (remainingLitres / tank) * 100));
  const kmLeft = Math.round(remainingLitres * avgKmL);
  return { pct, kmLeft };
}

export function monthTrend(entries) {
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

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
