// components/ActiveSessions.js
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function ActiveSessions({ sessions, setActiveSessions }) {
  const navigate = useNavigate();
  const [csvUrls, setCsvUrls] = useState({});
  const [isDownloading, setIsDownloading] = useState({});
  const [isClosing, setIsClosing] = useState({});
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showAnalytics, setShowAnalytics] = useState(null);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(null);
  const [countdowns, setCountdowns] = useState({});

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      const newCountdowns = {};
      sessions.forEach((session) => {
        if (session.endTime) {
          const now = new Date();
          const endTime = new Date(session.endTime);
          const diff = endTime - now;

          if (diff <= 0) {
            newCountdowns[session._id] = 'Session ended';
          } else {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            newCountdowns[session._id] = `${hours}h ${minutes}m ${seconds}s`;
          }
        }
      });
      setCountdowns(newCountdowns);
    }, 1000);

    return () => clearInterval(timer);
  }, [sessions]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000); // Extended for better UX
  };

  const handleShowAnalytics = (session) => {
    setShowAnalytics(session);
  };

  const handleCloseSession = async (sessionId) => {
    setShowCloseConfirmation(sessionId);
  };

  const confirmCloseSession = async (sessionId) => {
    try {
      setIsClosing((prev) => ({ ...prev, [sessionId]: true }));
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}/close`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setActiveSessions((prev) => prev.filter((s) => s._id !== sessionId));

      if (response.data.csvUrl) {
        setCsvUrls((prev) => ({ ...prev, [sessionId]: response.data.csvUrl }));
        showToast('Session closed. Download available.', 'success');
      } else {
        showToast(response.data.message || 'Session closed', 'info');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to close session', 'error');
    } finally {
      setIsClosing((prev) => ({ ...prev, [sessionId]: false }));
      setShowCloseConfirmation(null);
    }
  };

  const handleDownloadCsv = async (sessionId, courseId) => {
    try {
      setIsDownloading((prev) => ({ ...prev, [sessionId]: true }));
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}${csvUrls[sessionId]}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance_${courseId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('CSV downloaded successfully', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to download CSV', 'error');
    } finally {
      setIsDownloading((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

  // Function to count attendees by department
  const getDepartmentStats = (attendees) => {
    const stats = {};
    attendees.forEach((attendee) => {
      const dept = attendee.userId?.department || 'Unknown';
      stats[dept] = (stats[dept] || 0) + 1;
    });
    return stats;
  };

  return (
    <motion.div
      className="bg-white p-6 rounded-lg shadow-md border border-gray-200"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-3">Active Sessions</h2>
      <p className="text-gray-600 mb-4 text-sm">
        View and manage ongoing sessions. For accurate location data, sessions are created using Chrome or Safari on a mobile device with Wi-Fi and location services enabled.
      </p>

      {sessions.length === 0 ? (
        <p className="text-gray-600 text-sm">No active sessions</p>
      ) : (
        <ul className="space-y-4">
          {sessions.map((session) => (
            <li
              key={session._id}
              className="border-b border-gray-200 pb-4 last:border-b-0"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {session.courseName}
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1 mt-1">
                    <p>
                      <span className="font-medium">Department:</span>{' '}
                      {session.department}
                    </p>
                    <p>
                      <span className="font-medium">Passcode:</span>{' '}
                      {session.passcode}
                    </p>
                    <p>
                      <span className="font-medium">Attendees:</span>{' '}
                      {session.attendees?.length || 0}
                    </p>
                    <p>
                      <span className="font-medium">Time Remaining:</span>{' '}
                      {countdowns[session._id] || 'Calculating...'}
                    </p>
                    <p>
                      <span className="font-medium">Location:</span>{' '}
                      Lat: {session.location?.latitude?.toFixed(6) || 'N/A'}, 
                      Lon: {session.location?.longitude?.toFixed(6) || 'N/A'}
                    </p>
                    <p>
                      <span className="font-medium">Geofence Radius:</span>{' '}
                      {session.radius || 'N/A'} meters
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleShowAnalytics(session)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
                  >
                    Analytics
                  </button>
                  {csvUrls[session._id] ? (
                    <button
                      onClick={() => handleDownloadCsv(session._id, session.courseId)}
                      disabled={isDownloading[session._id]}
                      className={`px-4 py-2 text-white rounded-lg transition-colors duration-200 text-sm font-medium ${
                        isDownloading[session._id]
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {isDownloading[session._id] ? 'Downloading...' : 'Download CSV'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCloseSession(session._id)}
                      disabled={isClosing[session._id]}
                      className={`px-4 py-2 text-white rounded-lg transition-colors duration-200 text-sm font-medium ${
                        isClosing[session._id]
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {isClosing[session._id] ? 'Closing...' : 'Close'}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <motion.div
            className="bg-white p-6 rounded-lg w-full max-w-lg shadow-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Analytics: {showAnalytics.courseName}
            </h3>

            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">Attendance by Department</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                {Object.entries(getDepartmentStats(showAnalytics.attendees || [])).map(
                  ([dept, count]) => (
                    <li key={dept} className="flex justify-between">
                      <span>{dept}</span>
                      <span>{count} students</span>
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">Session Details</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="font-medium">Total Attendees:</span>{' '}
                  {showAnalytics.attendees?.length || 0}
                </p>
                <p>
                  <span className="font-medium">Time Remaining:</span>{' '}
                  {countdowns[showAnalytics._id] || 'Calculating...'}
                </p>
                <p>
                  <span className="font-medium">Location:</span>{' '}
                  Lat: {showAnalytics.location?.latitude?.toFixed(6) || 'N/A'}, 
                  Lon: {showAnalytics.location?.longitude?.toFixed(6) || 'N/A'}
                </p>
                <p>
                  <span className="font-medium">Geofence Radius:</span>{' '}
                  {showAnalytics.radius || 'N/A'} meters
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAnalytics(null)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200 text-sm font-medium"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}

      {/* Close Confirmation Modal */}
      {showCloseConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <motion.div
            className="bg-white p-6 rounded-lg w-full max-w-lg shadow-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4">Close Session</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Are you sure you want to close this session?
            </p>
            <p className="text-gray-600 mb-4 text-sm">
              A download will be available for the attendance records.
            </p>

            <div className="flex space-x-4">
              <button
                onClick={() => confirmCloseSession(showCloseConfirmation)}
                disabled={isClosing[showCloseConfirmation]}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors duration-200 text-sm font-medium ${
                  isClosing[showCloseConfirmation]
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isClosing[showCloseConfirmation] ? 'Closing...' : 'Yes, Close Session'}
              </button>
              <button
                onClick={() => setShowCloseConfirmation(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <motion.div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 text-white text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-600'
              : toast.type === 'error'
              ? 'bg-red-600'
              : 'bg-blue-600'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          {toast.message}
        </motion.div>
      )}
    </motion.div>
  );
}