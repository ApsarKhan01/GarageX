import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CountUp({ value, prefix = "", suffix = "", decimals = 0, className = "" }) {
  const ref = useRef(null);
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 60, damping: 18 });

  useEffect(() => {
    motionValue.set(Number(value) || 0);
  }, [value, motionValue]);

  useEffect(() => {
    return spring.on("change", (v) => {
      if (!ref.current) return;
      const formatted = decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString();
      ref.current.textContent = `${prefix}${formatted}${suffix}`;
    });
  }, [spring, prefix, suffix, decimals]);

  return <span ref={ref} className={className}>{prefix}0{suffix}</span>;
}

export function AnimatedProgress({ value, colorClass = "accent", delay = 0 }) {
  return (
    <div className="progress">
      <motion.span
        className={colorClass}
        initial={{ width: "0%" }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: "block", height: "100%", borderRadius: "inherit" }}
      />
    </div>
  );
}
