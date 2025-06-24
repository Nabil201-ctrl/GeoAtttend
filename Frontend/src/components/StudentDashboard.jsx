// components/StudentDashboard.js
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import * as FingerprintJS from '@fingerprintjs/fingerprintjs';

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
    let fpPromise;

    const initializeFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setDeviceId(result.visitorId);
      } catch (error) {
        console.error('Failed to generate device ID:', error);
        showToast('Failed to initialize device identification. Please refresh the page.', 'error');
      }
    };

    initializeFingerprint();

    const fetchUserAndCourses = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Session expired. Please log in again.', 'error');
        navigate('/');
        return;
      }

      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(base64));

        // Check token expiration
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          showToast('Session expired. Please log in again.', 'error');
          navigate('/');
          return;
        }

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

    return () => {
      // Cleanup if needed
    };
  }, [navigate]);

  const fetchEnrolledCourses = async (studentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { studentId },
      });
      setEnrolledCourses(response.data.map((course) => course.courseId));
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      showToast('Failed to load enrolled courses.', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
  };

  const handleGetLocation = () => {
    setIsLoadingLocation(true);

    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
    const isMobileOrTablet = /Mobi|Android|iPad/i.test(navigator.userAgent);
    const isLaptop = !isMobileOrTablet && (window.screen.width > 1280 || !('ontouchstart' in window));

    if (isLaptop || !isMobileOrTablet || !(isChrome || isSafari)) {
      showToast(
        'For best location accuracy, please use Chrome or Safari on a mobile device or iPad with Wi-Fi and location services enabled. Laptops are not supported.',
        'error'
      );
      setIsLoadingLocation(false);
      return;
    }

    if (navigator.geolocation) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'denied') {
          showToast(
            'Location access is denied. Please enable location permissions in your browser settings and ensure Wi-Fi is turned on.',
            'error'
          );
          setIsLoadingLocation(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude.toFixed(6);
            const lng = position.coords.longitude.toFixed(6);

            // Check for invalid coordinates (0,0 or null island)
            if (lat === '0.000000' && lng === '0.000000') {
              showToast('Invalid location detected. Please try again in a different location.', 'error');
              setIsLoadingLocation(false);
              return;
            }

            setLocation({
              latitude: lat,
              longitude: lng,
            });
            setIsLoadingLocation(false);
            showToast('Location acquired successfully!', 'success');
          },
          (error) => {
            let errorMessage = 'Failed to get location. ';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage += 'Please enable location permissions and ensure Wi-Fi is turned on.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage += 'Location information is unavailable. Try again with Wi-Fi enabled.';
                break;
              case error.TIMEOUT:
                errorMessage += 'The request timed out. Ensure Wi-Fi is on and try again.';
                break;
              default:
                errorMessage += 'An unknown error occurred.';
                break;
            }
            showToast(errorMessage, 'error');
            setIsLoadingLocation(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      }).catch(() => {
        showToast('Failed to check location permissions.', 'error');
        setIsLoadingLocation(false);
      });
    } else {
      showToast('Geolocation is not supported by your browser.', 'error');
      setIsLoadingLocation(false);
    }
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (!passcode || !location.latitude || !location.longitude || !deviceId) {
      showToast('Please enter passcode, get location, and ensure device ID is generated.', 'error');
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

    // More robust coordinate validation
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180 ||
      (lat === 0 && lon === 0)) {
      showToast('Invalid coordinates. Please get a valid location.', 'error');
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
          deviceId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000 // Add timeout to prevent hanging
        }
      );

      if (response.data.enrolled) {
        showToast('Attendance marked successfully! You are now enrolled in this course.', 'success');
        await fetchEnrolledCourses(user.id); // Wait for refresh
      } else {
        showToast('Attendance marked successfully!', 'success');
      }
      setPasscode('');
      setLocation({ latitude: '', longitude: '' });
    } catch (error) {
      let errorMessage = 'Failed to mark attendance. Please try again.';
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
          navigate('/');
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }
      console.error('Attendance error:', error);
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
      transition={{ duration: 0.3 }}
    >
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Student Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 flex-grow">
        <motion.div
          className="bg-white p-6 rounded-lg shadow-md border border-gray-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Mark Attendance</h2>
          <p className="text-gray-600 mb-4 text-sm">
            Enter the session passcode and get your location to mark attendance. For best results, use Chrome or Safari on a mobile device or iPad with location services and Wi-Fi enabled (even if not connected). Laptops are not supported. Your device is uniquely identified to prevent spoofing.
          </p>
          {enrolledCourses.length === 0 && (
            <p className="text-red-600 mb-4 text-sm">
              You are not enrolled in any courses. Mark attendance with a valid passcode to enroll.
            </p>
          )}
          <form onSubmit={handleMarkAttendance} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passcode</label>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 transition-colors"
                placeholder="e.g., CS101-123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={location.latitude}
                  onChange={(e) => setLocation({ ...location, latitude: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 transition-colors"
                  placeholder="Latitude"
                  step="any"
                />
                <input
                  type="number"
                  value={location.longitude}
                  onChange={(e) => setLocation({ ...location, longitude: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 transition-colors"
                  placeholder="Longitude"
                  step="any"
                />
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLoadingLocation}
                  className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isLoadingLocation ? 'Getting...' : 'Get Location'}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !deviceId}
              className={`w-full p-3 text-white rounded-lg transition-colors duration-200 text-sm font-medium ${isSubmitting || !deviceId ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {isSubmitting ? 'Submitting...' : 'Mark Attendance'}
            </button>
          </form>
        </motion.div>
      </main>
      {toast.show && (
        <motion.div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
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