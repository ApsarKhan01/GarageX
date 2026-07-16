import { motion } from "framer-motion";

export function AnimatedLinePath({ d, stroke = "#c41e3a", strokeWidth = 3, delay = 0 }) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}

export function AnimatedBar({ heightPct, delay = 0, title }) {
  return (
    <motion.div
      className="bar"
      title={title}
      initial={{ height: "0%" }}
      animate={{ height: `${heightPct}%` }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}

export function AnimatedSparkline({ points, color = "#22c55e" }) {
  const max = Math.max(...points, 1);
  const coords = points.map((t, i) => {
    const x = 10 + i * 50;
    const y = 24 - (t / max) * 20;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="sparkline">
      <svg viewBox="0 0 300 28" preserveAspectRatio="none">
        <motion.polyline
          points={coords}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
    </div>
  );
}
