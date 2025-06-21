// components/StatsCard.js
import { motion } from 'framer-motion';

export default function StatsCard({ title, value, subtitle, icon }) {
  const icons = {
    schedule: '🕒',
    menu_book: '📚',
    people: '👥',
    warning: '⚠️',
    devices: '💻',
    trending_up: '📈',
  };

  return (
    <motion.div
      className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-4">
        <span className="text-2xl">{icons[icon] || '📊'}</span>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{subtitle}</p>
        </div>
      </div>
    </motion.div>
  );
}