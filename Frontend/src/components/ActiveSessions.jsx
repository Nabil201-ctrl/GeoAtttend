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
      sessions.forEach(session => {
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
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
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
    attendees.forEach(attendee => {
      const dept = attendee.userId?.department || 'Unknown';
      stats[dept] = (stats[dept] || 0) + 1;
    });
    return stats;
  };

  return (
    <motion.div
      className="bg-white p-6 rounded-lg shadow-sm border border-border relative"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <h2 className="text-xl font-semibold mb-2">Active Sessions</h2>
      <p className="text-textSecondary mb-4 text-sm">View and manage ongoing sessions</p>
      
      {sessions.length === 0 ? (
        <p className="text-textSecondary">No active sessions</p>
      ) : (
        <ul className="space-y-4">
          {sessions.map((session) => (
            <li key={session._id} className="border-b pb-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-medium">{session.courseName}</h3>
                  <div className="text-sm text-textSecondary space-y-1">
                    <p>Department: {session.department}</p>
                    <p>Passcode: {session.passcode}</p>
                    <p>Attendees: {session.attendees?.length || 0}</p>
                    <p>Time remaining: {countdowns[session._id] || 'Calculating...'}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleShowAnalytics(session)}
                    className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Analytics
                  </button>
                  <button
                    onClick={() => handleCloseSession(session._id)}
                    disabled={isClosing[session._id]}
                    className={`p-2 text-white rounded ${
                      isClosing[session._id] 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {isClosing[session._id] ? 'Closing...' : 'Close'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div 
            className="bg-white p-6 rounded-lg w-full max-w-md"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h3 className="text-xl font-semibold mb-4">
              Analytics: {showAnalytics.courseName}
            </h3>
            
            <div className="mb-4">
              <h4 className="font-medium mb-2">Attendance by Department</h4>
              <ul className="space-y-1">
                {Object.entries(getDepartmentStats(showAnalytics.attendees || [])).map(([dept, count]) => (
                  <li key={dept} className="flex justify-between">
                    <span>{dept}</span>
                    <span>{count} students</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mb-4">
              <h4 className="font-medium mb-2">Session Details</h4>
              <p>Total Attendees: {showAnalytics.attendees?.length || 0}</p>
              <p>Time Remaining: {countdowns[showAnalytics._id] || 'Calculating...'}</p>
            </div>
            
            <button
              onClick={() => setShowAnalytics(null)}
              className="w-full p-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}

      {/* Close Confirmation Modal */}
      {showCloseConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div 
            className="bg-white p-6 rounded-lg w-full max-w-md"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h3 className="text-xl font-semibold mb-4">Close Session</h3>
            <p className="mb-4">Are you sure you want to close this session?</p>
            <p className="mb-4">A download will be available for the attendance records.</p>
            
            <div className="flex space-x-4">
              <button
                onClick={() => confirmCloseSession(showCloseConfirmation)}
                disabled={isClosing[showCloseConfirmation]}
                className={`flex-1 p-2 text-white rounded ${
                  isClosing[showCloseConfirmation] 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isClosing[showCloseConfirmation] ? 'Closing...' : 'Yes, Close Session'}
              </button>
              <button
                onClick={() => setShowCloseConfirmation(null)}
                className="flex-1 p-2 bg-gray-200 rounded hover:bg-gray-300"
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
          className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            toast.type === 'success' ? 'bg-green-500' :
            toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
          } text-white`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          {toast.message}
        </motion.div>
      )}
    </motion.div>
  );
}