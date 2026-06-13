import { motion } from "framer-motion";

function FloatingOrb({ size, top, left }) {
  return (
    <motion.div
      style={{
        width: size,
        height: size,
        top,
        left
      }}
      className="orb"
      animate={{
        y: [0, -30, 0],
        x: [0, 15, 0]
      }}
      transition={{
        duration: 8,
        repeat: Infinity
      }}
    />
  );
}

export default FloatingOrb;