import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function ActiveSessions({ sessions, setActiveSessions }) {
  const navigate = useNavigate();
  const [csvUrls, setCsvUrls] = useState({}); // Track CSV URLs for closed sessions
  const [isDownloading, setIsDownloading] = useState({}); // Track download state per session
  const [isClosing, setIsClosing] = useState({}); // Track closing state per session
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleCloseSession = async (sessionId) => {
    try {
      setIsClosing((prev) => ({ ...prev, [sessionId]: true }));
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Session expired. Please log in again.', 'error');
        navigate('/');
        return;
      }
      const response = await axios.patch(
        `https://geoattend1.onrender.com/api/sessions/${sessionId}/close`, // Use absolute URL
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove closed session from active sessions
      setActiveSessions((prev) => prev.filter((s) => s._id !== sessionId));

      // Store CSV URL if provided
      if (response.data.csvUrl) {
        setCsvUrls((prev) => ({ ...prev, [sessionId]: response.data.csvUrl }));
        showToast('Session closed successfully. Download available.', 'success');
      } else {
        showToast(response.data.message || 'Session closed, no attendees to export.', 'info');
      }
    } catch (error) {
      console.error('Failed to close session:', error);
      showToast(error.response?.data?.message || 'Failed to close session.', 'error');
    } finally {
      setIsClosing((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

  const handleDownloadCsv = async (sessionId, courseId) => {
    try {
      setIsDownloading((prev) => ({ ...prev, [sessionId]: true }));
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Session expired. Please log in again.', 'error');
        navigate('/');
        return;
      }

      const response = await axios.get(
        `http://localhost:5000${csvUrls[sessionId]}`, // Use absolute URL
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob', // Important for handling binary data
        }
      );

      // Create a Blob from the response data
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `session_${courseId}_attendees.csv`; // Use courseId for filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('CSV downloaded successfully.', 'success');
    } catch (error) {
      console.error('Failed to download CSV:', error);
      showToast(error.response?.data?.message || 'Failed to download CSV.', 'error');
    } finally {
      setIsDownloading((prev) => ({ ...prev, [sessionId]: false }));
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
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleCloseSession(session._id)}
                    disabled={isClosing[session._id]}
                    className={`p-2 text-white rounded transition-all duration-200 ${isClosing[session._id]
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-error hover:bg-red-700'
                      }`}
                  >
                    {isClosing[session._id] ? 'Closing...' : 'Close'}
                  </button>
                  {csvUrls[session._id] && (
                    <button
                      onClick={() => handleDownloadCsv(session._id, session.courseId)}
                      disabled={isDownloading[session._id]}
                      className={`p-2 text-white rounded transition-all duration-200 ${isDownloading[session._id]
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-primary hover:bg-accent'
                        }`}
                    >
                      {isDownloading[session._id] ? 'Downloading...' : 'Download CSV'}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {toast.show && (
        <motion.div
          className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${toast.type === 'success'
              ? 'bg-success text-white'
              : toast.type === 'info'
                ? 'bg-blue-500 text-white'
                : 'bg-error text-white'
            }`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          {toast.message}
        </motion.div>
      )}
    </motion.div>
  );
}