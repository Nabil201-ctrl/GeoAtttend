import { motion } from 'framer-motion';

export default function RecentSessions({ sessions }) {
  if (!sessions || !Array.isArray(sessions)) {
    return (
      <motion.div
        className="bg-white p-6 rounded-lg shadow-sm border border-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-xl font-semibold mb-2">Recent Sessions</h2>
        <p className="text-textSecondary">Loading sessions...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-white p-6 rounded-lg shadow-sm border border-border"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-xl font-semibold mb-2">Recent Sessions</h2>
      <p className="text-textSecondary mb-4 text-sm">View your recently created sessions</p>
      {sessions.length === 0 ? (
        <p className="text-textSecondary">No recent sessions</p>
      ) : (
        <ul className="space-y-4">
          {sessions.map((session) => (
            <li key={session._id} className="border-b pb-2">
              <h3 className="text-lg font-medium">{session.courseName || 'Unknown Course'}</h3>
              <p className="text-sm text-textSecondary">
                {session.department || 'Unknown Department'} | Attendees: {(session.attendees || []).length}
              </p>
              <p className="text-sm text-textSecondary">
                Started: {session.startTime ? new Date(session.startTime).toLocaleString() : 'N/A'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}