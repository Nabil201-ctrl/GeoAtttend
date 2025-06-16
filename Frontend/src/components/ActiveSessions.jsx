import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function ActiveSessions({ sessions, setActiveSessions }) {
  const navigate = useNavigate();

  const handleCloseSession = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }
      await axios.patch(
        `/api/sessions/${sessionId}/close`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActiveSessions((prev) => prev.filter((s) => s._id !== sessionId));
    } catch (error) {
      console.error('Failed to close session:', error);
    }
  };

  if (!sessions || !Array.isArray(sessions)) {
    return (
      <motion.div
        className="bg-white p-6 rounded-lg shadow-sm border border-border"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <h2 className="text-xl font-semibold mb-2">Active Sessions</h2>
        <p className="text-textSecondary">Loading sessions...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-white p-6 rounded-lg shadow-sm border border-border"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <h2 className="text-xl font-semibold mb-2">Active Sessions</h2>
      <p className="text-textSecondary mb-4 text-sm">View and manage your ongoing sessions</p>
      {sessions.length === 0 ? (
        <p className="text-textSecondary">No active sessions</p>
      ) : (
        <ul className="space-y-4">
          {sessions.map((session) => (
            <li key={session._id} className="border-b pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">{session.courseName || 'Unknown Course'}</h3>
                  <p className="text-sm text-textSecondary">
                    {session.department || 'Unknown Department'} | Passcode: {session.passcode || 'N/A'}
                  </p>
                  <p className="text-sm text-textSecondary">
                    Attendees: {(session.attendees || []).length}
                  </p>
                  <p className="text-sm text-textSecondary">
                    Ends: {session.endTime ? new Date(session.endTime).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => handleCloseSession(session._id)}
                  className="p-2 bg-error text-white rounded hover:bg-red-700"
                >
                  Close
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}