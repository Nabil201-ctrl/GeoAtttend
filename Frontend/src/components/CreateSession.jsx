import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [isLoading, setIsLoading] = useState({
    courses: false,
    location: false,
    submit: false,
  });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const geofenceOptions = useMemo(() => [
    { id: 'hall-45', name: 'Around Hall (45m)', radius: 45 },
    { id: 'building-100', name: 'Around Building (100m)', radius: 100 },
    { id: 'campus-200', name: 'Campus Area (200m)', radius: 200 },
  ], []);

  const durationOptions = useMemo(() => [
    { id: '15min', name: '15 Minutes', minutes: 15 },
    { id: '1hr', name: '1 Hour', minutes: 60 },
    { id: '2hr', name: '2 Hours', minutes: 120 },
  ], []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  }, []);

  const fetchCourses = useCallback(async () => {
    setIsLoading((prev) => ({ ...prev, courses: true }));
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Session Expired. Please log in again.');
      }

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const coursesData = Array.isArray(response.data.data) ? response.data.data : response.data;
      if (!Array.isArray(coursesData)) {
        throw new Error('Invalid courses data format');
      }

      setCourses(coursesData);
    } catch (error) {
      console.error('Course fetch error:', error);
      showToast(error.message || 'Failed to fetch courses', 'error');
      setCourses([]);
      if (error.message.includes('Session Expired')) {
        navigate('/');
      }
    } finally {
      setIsLoading((prev) => ({ ...prev, courses: false }));
    }
  }, [navigate, showToast]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleGetLocation = useCallback(() => {
    setIsLoading((prev) => ({ ...prev, location: true }));
    if (!navigator.geolocation) {
      showToast('Geolocation not supported', 'error');
      setIsLoading((prev) => ({ ...prev, location: false }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setErrors((prev) => ({ ...prev, latitude: '', longitude: '' }));
        setIsLoading((prev) => ({ ...prev, location: false }));
      },
      () => {
        showToast('Failed to get location', 'error');
        setIsLoading((prev) => ({ ...prev, location: false }));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [showToast]);

  const generatePasscode = useCallback(() => {
    if (!formData.courseId) {
      showToast('Select a course first', 'error');
      return;
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setFormData((prev) => ({ ...prev, passcode: `${formData.courseId}-${code}` }));
    setErrors((prev) => ({ ...prev, passcode: '' }));
  }, [formData.courseId]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.courseId) newErrors.courseId = 'Please select a course';
    if (!formData.passcode) newErrors.passcode = 'Passcode is required';
    if (!formData.latitude || isNaN(Number(formData.latitude))) {
      newErrors.latitude = 'Valid latitude required';
    }
    if (!formData.longitude || isNaN(Number(formData.longitude))) {
      newErrors.longitude = 'Valid longitude required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    setIsLoading((prev) => ({ ...prev, submit: true }));
    try {
      const startTime = new Date();
      const duration = durationOptions.find(opt => opt.id === formData.duration)?.minutes || 60;
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
        endTime: new Date(startTime.getTime() + duration * 60 * 1000).toISOString(),
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
      setIsLoading((prev) => ({ ...prev, submit: false }));
    }
  }, [formData, durationOptions, geofenceOptions, setActiveSessions, refreshCourses, showToast, validateForm]);

  const handleCourseChange = useCallback((e) => {
    const selectedCourse = courses.find((c) => c.courseId === e.target.value);
    setFormData((prev) => ({
      ...prev,
      courseId: e.target.value,
      courseName: selectedCourse?.name || '',
      department: selectedCourse?.department || '',
      passcode: '',
    }));
    setErrors((prev) => ({ ...prev, courseId: '' }));
  }, [courses]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-card border border-border">
      <h2 className="text-xl font-semibold mb-4">Create Attendance Session</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Course</label>
          <select
            value={formData.courseId}
            onChange={handleCourseChange}
            className={`w-full p-3 border rounded focus:outline-none focus:border-accent transition-colors ${errors.courseId ? 'border-error' : 'border-border'}`}
            disabled={isLoading.courses}
            aria-invalid={!!errors.courseId}
          >
            <option value="">{isLoading.courses ? 'Loading courses...' : 'Select Course'}</option>
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
            onChange={(e) => setFormData((prev) => ({ ...prev, geofence: e.target.value }))}
            className="w-full p-3 border rounded focus:outline-none focus:border-accent transition-colors border-border"
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
            onChange={(e) => setFormData((prev) => ({ ...prev, duration: e.target.value }))}
            className="w-full p-3 border rounded focus:outline-none focus:border-accent transition-colors border-border"
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
              className={`flex-grow p-3 border rounded-l focus:outline-none ${errors.passcode ? 'border-error' : 'border-border'} transition-colors`}
              placeholder="e.g., CS101-A9J42"
              aria-invalid={!!errors.passcode}
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
              className="p-3 bg-accent text-white border border-accent hover:bg-blue-600 disabled:opacity-50 transition-colors"
              aria-label="Copy passcode"
            >
              <i className="fas fa-copy"></i>
            </button>
            <button
              type="button"
              onClick={generatePasscode}
              className="p-3 bg-accent text-white border border-accent rounded-r hover:bg-blue-600 transition-colors"
              aria-label="Generate new passcode"
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
                setFormData((prev) => ({ ...prev, latitude: e.target.value }));
                setErrors((prev) => ({ ...prev, latitude: '' }));
              }}
              className={`w-full p-3 border rounded focus:outline-none focus:border-accent transition-colors ${errors.latitude ? 'border-error' : 'border-border'}`}
              placeholder="Latitude"
              step="any"
              aria-invalid={!!errors.latitude}
            />
            <input
              type="number"
              value={formData.longitude}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, longitude: e.target.value }));
                setErrors((prev) => ({ ...prev, longitude: '' }));
              }}
              className={`w-full p-3 border rounded focus:outline-none focus:border-accent transition-colors ${errors.longitude ? 'border-error' : 'border-border'}`}
              placeholder="Longitude"
              step="any"
              aria-invalid={!!errors.longitude}
            />
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={isLoading.location}
              className="p-3 bg-accent text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
              aria-label="Get current location"
            >
              {isLoading.location ? 'Getting...' : 'Get Location'}
            </button>
          </div>
          {(errors.latitude || errors.longitude) && (
            <p className="text-error text-xs mt-1">{errors.latitude || errors.longitude}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading.submit}
          className={`w-full p-3 text-white rounded transition-colors duration-200 ${isLoading.submit ? 'bg-gray-400 cursor-not-allowed' : 'bg-accent hover:bg-blue-600'}`}
        >
          {isLoading.submit ? 'Creating...' : 'Create Session'}
        </button>
      </form>

      {toast.show && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg text-white transition-opacity duration-300 ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}
          role="alert"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}