import { motion } from "framer-motion";

function FeatureCard({ icon: Icon, title, desc, index }) {
  return (
    <motion.div
      className="feature-card"
      initial={{ opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, delay: index * 0.06 }}
      whileHover={{ y: -10, scale: 1.02 }}
    >
      <div className="feature-icon">
        <Icon size={26} />
      </div>

      <h3>{title}</h3>

      <p>{desc}</p>
    </motion.div>
  );
}

export default FeatureCard;
