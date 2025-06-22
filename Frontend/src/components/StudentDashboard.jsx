// components/StudentDashboard.js
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FingerprintJS from 'fingerprintjs2';

export default function StudentDashboard() {
  const [passcode, setPasscode] = useState('');
  const [location, setLocation] = useState({ latitude: '', longitude: '' });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [user, setUser] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Generate device ID
    FingerprintJS.get((components) => {
      const values = components.map(component => component.value);
      const fingerprint = FingerprintJS.x64hash128(values.join(''), 31);
      setDeviceId(fingerprint);
    });

    const fetchUserAndCourses = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Session expired. Please log in again.', 'error');
        navigate('/');
        return;
      }

      try {
        // Verify token is valid and belongs to a student
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(base64));
        
        if (decoded.role !== 'student') {
          showToast('Only students can access this dashboard.', 'error');
          navigate('/');
          return;
        }

        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          await fetchEnrolledCourses(parsedUser.id);
        } else {
          showToast('User data not found. Please log in again.', 'error');
          navigate('/');
        }
      } catch (error) {
        console.error('Error verifying token:', error);
        showToast('Invalid session. Please log in again.', 'error');
        navigate('/');
      }
    };

    fetchUserAndCourses();
  }, [navigate]);

  const fetchEnrolledCourses = async (studentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { studentId },
      });
      setEnrolledCourses(response.data.map(course => course.courseId));
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      showToast('Failed to load enrolled courses.', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleGetLocation = () => {
    setIsLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6),
          });
          setIsLoadingLocation(false);
        },
        () => {
          showToast('Failed to get location', 'error');
          setIsLoadingLocation(false);
        }
      );
    } else {
      showToast('Geolocation not supported', 'error');
      setIsLoadingLocation(false);
    }
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (!passcode || !location.latitude || !location.longitude || !deviceId) {
      showToast('Please enter passcode, get location, and ensure device ID is generated', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Authentication token missing. Please log in again.', 'error');
      navigate('/');
      return;
    }

    const lat = parseFloat(location.latitude);
    const lon = parseFloat(location.longitude);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      showToast('Invalid coordinates. Please enter valid latitude (-90 to 90) and longitude (-180 to 180).', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/sessions/attend`,
        {
          passcode,
          location: { latitude: lat, longitude: lon },
          student: { id: user.id, name: user.name, email: user.email },
          deviceId
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.enrolled) {
        showToast('Attendance marked successfully! You are now enrolled in this course.', 'success');
        fetchEnrolledCourses(user.id);
      } else {
        showToast('Attendance marked successfully!', 'success');
      }
      setPasscode('');
      setLocation({ latitude: '', longitude: '' });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to mark attendance. Please try again.';
      console.error('Attendance error:', errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    showToast('Logged out successfully', 'success');
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-gray-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Student Dashboard</h1>
          <button
            onClick={handleLogout}
            className="p-2 bg-error text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 flex-grow">
        <motion.div
          className="bg-white p-6 rounded-lg shadow-sm border border-border"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-semibold mb-2">Mark Attendance</h2>
          <p className="text-textSecondary mb-4 text-sm">
            Enter the session passcode and get your location to mark attendance.
            Your device is uniquely identified to prevent spoofing.
          </p>
          {enrolledCourses.length === 0 && (
            <p className="text-error mb-4 text-sm">
              You are not enrolled in any courses. Mark attendance with a valid passcode to enroll.
            </p>
          )}
          <form onSubmit={handleMarkAttendance} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Passcode</label>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full p-3 border border-border rounded focus:outline-none focus:border-primary"
                placeholder="e.g., CS101-123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={location.latitude}
                  onChange={(e) => setLocation({ ...location, latitude: e.target.value })}
                  className="w-full p-3 border border-border rounded focus:outline-none focus:border-primary"
                  placeholder="Latitude"
                  step="any"
                />
                <input
                  type="number"
                  value={location.longitude}
                  onChange={(e) => setLocation({ ...location, longitude: e.target.value })}
                  className="w-full p-3 border border-border rounded focus:outline-none focus:border-primary"
                  placeholder="Longitude"
                  step="any"
                />
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLoadingLocation}
                  className="p-3 bg-primary text-white rounded hover:bg-accent disabled:opacity-50"
                >
                  {isLoadingLocation ? 'Getting...' : 'Get Location'}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !deviceId}
              className={`w-full p-3 bg-primary text-white rounded hover:bg-accent transition-all duration-200 ${isSubmitting || !deviceId ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Submitting...' : 'Mark Attendance'}
            </button>
          </form>
        </motion.div>
      </main>
      {toast.show && (
        <motion.div
          className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${toast.type === 'success' ? 'bg-success text-white' : 'bg-error text-white'}`}
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