import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function CreateSession({ setActiveSessions, refreshCourses }) {
  const [formData, setFormData] = useState({
    courseId: '',
    courseName: '',
    department: '',
    latitude: '',
    longitude: '',
    geofence: 'hall-45',
    passcode: '',


    duration: '1hr',
  });
  const [courses, setCourses] = useState([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const geofenceOptions = [
    { id: 'hall-45', name: 'Around Hall (45m)', radius: 45 },
    { id: 'building-100', name: 'Around Building (100m)', radius: 100 },
    { id: 'campus-200', name: 'Campus Area (200m)', radius: 200 },
  ];

  const durationOptions = [
    { id: '15min', name: '15 Minutes', minutes: 15 },
    { id: '1hr', name: '1 Hour', minutes: 60 },
    { id: '2hr', name: '2 Hours', minutes: 120 },
  ];

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoadingCourses(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          showToast('Session Expired. Please log in again.', 'error');
          navigate('/');
          return;
        }
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCourses(response.data);
      } catch (error) {
        showToast('Failed to fetch courses', 'error');
      } finally {
        setIsLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [navigate]);

  const handleGetLocation = () => {
    setIsLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6),
          }));
          setIsLoadingLocation(false);
          setErrors((prev) => ({ ...prev, latitude: '', longitude: '' }));
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

  const generatePasscode = () => {
    if (!formData.courseId) {
      showToast('Select a course first', 'error');
      return;
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setFormData((prev) => ({ ...prev, passcode: `${formData.courseId}-${code}` }));
    setErrors((prev) => ({ ...prev, passcode: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.courseId) newErrors.courseId = 'Please select a course';
    if (!formData.passcode) newErrors.passcode = 'Passcode is required';
    if (
      formData.latitude === '' ||
      isNaN(Number(formData.latitude))
    ) newErrors.latitude = 'Valid latitude required';
    if (
      formData.longitude === '' ||
      isNaN(Number(formData.longitude))
    ) newErrors.longitude = 'Valid longitude required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + (durationOptions.find(opt => opt.id === formData.duration)?.minutes || 60) * 60 * 1000);
      const payload = {
        courseId: formData.courseId,
        courseName: formData.courseName,
        department: formData.department,
        location: {
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        },
        radius: geofenceOptions.find(opt => opt.id === formData.geofence)?.radius || 45,
        passcode: formData.passcode,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      };
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/sessions`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setActiveSessions((prev) => [...prev, response.data]);
      showToast('Session created successfully', 'success');
      setFormData({
        courseId: '',
        courseName: '',
        department: '',
        latitude: '',
        longitude: '',
        geofence: 'hall-45',
        passcode: '',
        duration: '1hr',
      });
      setErrors({});
      refreshCourses();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to create session', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-card border border-border">
      <h2 className="text-xl font-semibold mb-2">Create Attendance Session</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Course</label>
          <select
            value={formData.courseId}
            onChange={(e) => {
              const selectedCourse = courses.find((c) => c.courseId === e.target.value);
              setFormData({
                ...formData,
                courseId: e.target.value,
                courseName: selectedCourse?.name || '',
                department: selectedCourse?.department || '',
                passcode: '',
              });
              setErrors((prev) => ({ ...prev, courseId: '' }));
            }}
            className={`w-full p-3 border rounded focus:outline-none focus:border-accent ${errors.courseId ? 'border-error' : 'border-border'
              }`}
            disabled={isLoadingCourses}
          >
            <option value="">{isLoadingCourses ? 'Loading courses...' : 'Select Course'}</option>
            {courses.map((course) => (
              <option key={course.courseId} value={course.courseId}>
                {course.courseId} - {course.name}
              </option>
            ))}
          </select>
          {errors.courseId && <p className="text-error text-xs mt-1">{errors.courseId}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Geofence</label>
          <select
            value={formData.geofence}
            onChange={(e) => setFormData({ ...formData, geofence: e.target.value })}
            className="w-full p-3 border rounded focus:outline-none focus:border-accent"
          >
            {geofenceOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Duration</label>
          <select
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            className="w-full p-3 border rounded focus:outline-none focus:border-accent"
          >
            {durationOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Session Passcode</label>
          <div className="flex">
            <input
              type="text"
              value={formData.passcode}
              readOnly
              className={`flex-grow p-3 border rounded-l focus:outline-none ${errors.passcode ? 'border-error' : 'border-border'
                }`}
              placeholder="e.g., CS101-A9J42"
            />
            <button
              type="button"
              onClick={async () => {
                if (!formData.passcode) return;
                try {
                  await navigator.clipboard.writeText(formData.passcode);
                  showToast('Passcode copied', 'success');
                } catch {
                  showToast('Copy failed', 'error');
                }
              }}
              disabled={!formData.passcode}
              className="p-3 bg-accent text-white border border-accent hover:bg-blue-600 disabled:opacity-50"
            >
              <i className="far fa-copy"></i>
            </button>
            <button
              type="button"
              onClick={generatePasscode}
              className="p-3 bg-accent text-white border border-accent rounded-r hover:bg-blue-600"
            >
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>
          {errors.passcode && <p className="text-error text-xs mt-1">{errors.passcode}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={formData.latitude}
              onChange={(e) => {
                setFormData({ ...formData, latitude: e.target.value });
                setErrors((prev) => ({ ...prev, latitude: '' }));
              }}
              className={`w-full p-3 border rounded focus:outline-none focus:border-accent ${errors.latitude ? 'border-error' : 'border-border'
                }`}
              placeholder="Latitude"
              step="any"
            />
            <input
              type="number"
              value={formData.longitude}
              onChange={(e) => {
                setFormData({ ...formData, longitude: e.target.value });
                setErrors((prev) => ({ ...prev, longitude: '' }));
              }}
              className={`w-full p-3 border rounded focus:outline-none focus:border-accent ${errors.longitude ? 'border-error' : 'border-border'
                }`}
              placeholder="Longitude"
              step="any"
            />
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={isLoadingLocation}
              className="p-3 bg-accent text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoadingLocation ? 'Getting...' : 'Get Location'}
            </button>
          </div>
          {(errors.latitude || errors.longitude) && (
            <p className="text-error text-xs mt-1">{errors.latitude || errors.longitude}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full p-3 text-white rounded transition duration-200 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-accent hover:bg-blue-600'
            }`}
        >
          {isSubmitting ? 'Creating...' : 'Create Session'}
        </button>
      </form>
      {toast.show && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}