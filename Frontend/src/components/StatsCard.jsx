import { motion } from 'framer-motion';

export default function StatsCard({ title, value, subtitle, icon }) {
  const icons = {
    schedule: '🕒',
    menu_book: '📚',
    people: '👥',
  };

  return (
    <motion.div
      className="bg-white p-4 rounded-lg shadow-sm border border-border"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center space-x-4">
        <span className="text-2xl">{icons[icon]}</span>
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-textSecondary text-sm">{subtitle}</p>
        </div>
      </div>
    </motion.div>
  );
}