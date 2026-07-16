import { motion } from "framer-motion";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function AnimatedCard({ children, className = "", index = 0, hover = true, ...props }) {
  return (
    <motion.div
      className={className}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      whileHover={
        hover
          ? {
              y: -4,
              scale: 1.01,
              boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
              borderColor: "rgba(196, 30, 58, 0.25)",
            }
          : undefined
      }
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StatCard({ label, value, hint, progress, progressClass, index }) {
  return (
    <AnimatedCard className="stat-card" index={index}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint && <div className="hint">{hint}</div>}
      {progress}
    </AnimatedCard>
  );
}
