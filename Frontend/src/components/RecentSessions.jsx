import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Listbox } from '@headlessui/react';
import { CheckIcon, ChevronDownIcon, MapPinIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// BUG FIXES:
// 1. Remove nested useEffect (was causing React hook errors).
// 2. Move all handlers and helpers outside of useEffect.
// 3. Fix course name rendering (use course.name, not course.courseName).
// 4. Ensure correct export name (RecentSessions, not CreateSession).
// 5. Fix setFormData in handleGetLocation to use previous state.

export default function RecentSessions({ setActiveSessions, refreshCourses, showAlert }) {
  const [formData, setFormData] = useState({
    courseCode: '',
    passcode: '',
    center: { lat: '', lng: '' },
    geofence: 'hall-45',
    duration: '1hr',
  });
  const [courses, setCourses] = useState([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  useEffect(() => {
    const fetchCourses = async (retries = 3, delay = 1000) => {
      setIsLoadingCourses(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          showAlert('Error', 'Please log in again', 'error');
          navigate('/');
          return;
        }
        const response = await axios.get(`https://geoattend1.onrender.com/api/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const coursesData = Array.isArray(response.data.data) ? response.data.data : [];
        // Ensure course objects have 'courseCode' and 'name' for rendering
        const validCourses = coursesData.filter(
          (course) => course && typeof course === 'object' && course.courseCode && course.name
        );
        validCourses.sort((a, b) => {
          const nameA = a.name || ''; // Default to empty string for safety
          const nameB = b.name || ''; // Default to empty string for safety
          return nameA.localeCompare(nameB);
        });
        setCourses(validCourses);
        if (validCourses.length === 0 && coursesData.length > 0) {
          console.warn(
            'Invalid course data received:',
            coursesData.map((course) => ({
              courseCode: course.courseCode,
              name: course.name,
              enrolledStudentIds: course.enrolledStudentIds,
            }))
          );
          showAlert('Warning', 'No valid courses found. Please check course data.', 'warning');
        }
      } catch (error) {
        if (error.response?.status === 429 && retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          return fetchCourses(retries - 1, delay * 2);
        }
        console.error('Fetch courses error:', error);
        showAlert(
          'Error',
          error.response?.data?.error?.message || 'Failed to fetch courses',
          'error'
        );
        setCourses([]); // Clear courses on error
      } finally {
        setIsLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [navigate, showAlert]);

  const handleGetLocation = () => {
    setIsLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            center: {
              lat: position.coords.latitude.toFixed(6),
              lng: position.coords.longitude.toFixed(6),
            },
          }));
          setErrors((prev) => ({ ...prev, lat: '', lng: '' }));
          setIsLoadingLocation(false);
          showAlert('Success', 'Location acquired successfully!', 'success');
        },
        (error) => {
          let message = 'Failed to get location';
          if (error.code === error.PERMISSION_DENIED) {
            message = 'Location access denied. Please enable it in your browser settings.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = 'Location information is unavailable.';
          }
          showAlert('Error', message, 'error');
          setIsLoadingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      showAlert('Error', 'Geolocation is not supported by this browser', 'error');
      setIsLoadingLocation(false);
    }
  };

  const generatePasscode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const passcode = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    setFormData((prev) => ({ ...prev, passcode }));
    setErrors((prev) => ({ ...prev, passcode: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.courseCode) newErrors.courseCode = 'Please select a course';
    if (!formData.passcode) newErrors.passcode = 'Passcode is required';
    else if (formData.passcode.length < 4) newErrors.passcode = 'Passcode must be at least 4 characters';
    if (!formData.center.lat) newErrors.lat = 'Latitude is required';
    else if (isNaN(formData.center.lat) || formData.center.lat < -90 || formData.center.lat > 90)
      newErrors.lat = 'Latitude must be a number between -90 and 90';
    if (!formData.center.lng) newErrors.lng = 'Longitude is required';
    else if (isNaN(formData.center.lng) || formData.center.lng < -180 || formData.center.lng > 180)
      newErrors.lng = 'Longitude must be a number between -180 and 180';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showAlert('Validation Error', 'Please fill in all required fields correctly', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedGeofence = geofenceOptions.find((g) => g.id === formData.geofence);
      const selectedDuration = durationOptions.find((d) => d.id === formData.duration);
      const expiresAt = new Date(Date.now() + selectedDuration.minutes * 60 * 1000);

      const response = await axios.post(
        'https://geoattend1.onrender.com/api/fences',
        {
          courseCode: formData.courseCode,
          radius: selectedGeofence.radius,
          passcode: formData.passcode,
          expiresAt,
          center: {
            lat: parseFloat(formData.center.lat),
            lng: parseFloat(formData.center.lng),
          },
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      setActiveSessions((prev) => [...prev, response.data.data]);
      showAlert('Success', response.data.message, 'success');
      setFormData({
        courseCode: '',
        passcode: '',
        center: { lat: '', lng: '' },
        geofence: 'hall-45',
        duration: '1hr',
      });
      setErrors({});
      refreshCourses();
    } catch (error) {
      const errorData = error.response?.data?.error || {};
      if (['COURSE_NOT_FOUND', 'INVALID_COORDINATES', 'INVALID_RADIUS', 'INVALID_PASSCODE', 'INVALID_EXPIRES_AT'].includes(errorData.code)) {
        setErrors({ [errorData.code.toLowerCase().split('_')[0]]: errorData.message });
      } else {
        setErrors({});
      }
      showAlert('Error', errorData.message || 'Failed to create session', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Create New Session</h2>
      <p className="text-gray-600 mb-4 text-sm">Set up a new attendance session for your course</p>
      <form onSubmit={handleSubmit} className="space-y-4" aria-live="polite">
        <div>
          <label htmlFor="courseCode" className="block text-sm font-medium text-gray-700 mb-1">
            Course
          </label>
          <select
            id="courseCode"
            name="courseCode"
            value={formData.courseCode}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, courseCode: e.target.value }));
              setErrors((prev) => ({ ...prev, courseCode: '' }));
            }}
            className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.courseCode ? 'border-red-500' : 'border-gray-300'
              }`}
            disabled={isLoadingCourses}
            aria-describedby={errors.courseCode ? 'courseCode-error' : undefined}
          >
            <option value="">{isLoadingCourses ? 'Loading courses...' : 'Select Course'}</option>
            {courses.length > 0 ? (
              courses.map((course) => (
                <option key={course.courseCode} value={course.courseCode}>
                  {course.name} ({course.courseCode})
                </option>
              ))
            ) : (
              <option value="" disabled>
                No courses available
              </option>
            )}
          </select>
          {errors.courseCode && (
            <p id="courseCode-error" className="text-red-500 text-xs mt-1">
              {errors.courseCode}
            </p>
          )}
          {courses.length === 0 && !isLoadingCourses && (
            <p className="text-sm mt-2">
              No courses found.{' '}
              <button
                type="button"
                onClick={() =>
                  document.getElementById('create-course-section').scrollIntoView({ behavior: 'smooth' })
                }
                className="text-indigo-600 underline hover:text-indigo-700"
              >
                Create a course
              </button>
            </p>
          )}
        </div>
        <div>
          <label htmlFor="passcode" className="block text-sm font-medium text-gray-700 mb-1">
            Passcode
          </label>
          <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
            <input
              id="passcode"
              name="passcode"
              type="text"
              value={formData.passcode}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, passcode: e.target.value }));
                setErrors((prev) => ({ ...prev, passcode: '' }));
              }}
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.passcode ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="e.g., CS101-123"
              aria-describedby={errors.passcode ? 'passcode-error' : undefined}
            />
            <button
              type="button"
              onClick={generatePasscode}
              className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              aria-label="Generate Passcode"
            >
              Generate
            </button>
          </div>
          {errors.passcode && (
            <p id="passcode-error" className="text-red-500 text-xs mt-1">
              {errors.passcode}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
            <input
              id="latitude"
              name="lat"
              type="number"
              value={formData.center.lat}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  center: { ...prev.center, lat: e.target.value },
                }));
                setErrors((prev) => ({ ...prev, lat: '' }));
              }}
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.lat ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Latitude"
              step="any"
              aria-describedby={errors.lat ? 'latitude-error' : undefined}
            />
            <input
              id="longitude"
              name="lng"
              type="number"
              value={formData.center.lng}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  center: { ...prev.center, lng: e.target.value },
                }));
                setErrors((prev) => ({ ...prev, lng: '' }));
              }}
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.lng ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Longitude"
              step="any"
              aria-describedby={errors.lng ? 'longitude-error' : undefined}
            />
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={isLoadingLocation}
              className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              aria-label="Get Current Location"
            >
              {isLoadingLocation ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Getting...
                </div>
              ) : (
                <div className="flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  Get Location
                </div>
              )}
            </button>
          </div>
          {(errors.lat || errors.lng) && (
            <p id="location-error" className="text-red-500 text-xs mt-1">
              {errors.lat || errors.lng}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="geofence" className="block text-sm font-medium text-gray-700 mb-1">
            Geofence Size
          </label>
          <Listbox
            value={formData.geofence}
            onChange={(value) => setFormData((prev) => ({ ...prev, geofence: value }))}
          >
            <div className="relative">
              <Listbox.Button
                id="geofence"
                className="w-full p-3 border border-gray-300 rounded-lg text-left bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <span className="block truncate">
                  {geofenceOptions.find((g) => g.id === formData.geofence).name}
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </span>
              </Listbox.Button>
              <Listbox.Options className="absolute mt-1 w-full bg-white shadow-lg rounded-lg py-1 z-10 max-h-60 overflow-auto">
                {geofenceOptions.map((g) => (
                  <Listbox.Option
                    key={g.id}
                    value={g.id}
                    className={({ active }) =>
                      `cursor-pointer select-none relative py-2 pl-10 pr-4 ${active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                      }`
                    }
                  >
                    {({ selected }) => (
                      <>
                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                          {g.name}
                        </span>
                        {selected && (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
            Session Duration
          </label>
          <Listbox
            value={formData.duration}
            onChange={(value) => setFormData((prev) => ({ ...prev, duration: value }))}
          >
            <div className="relative">
              <Listbox.Button
                id="duration"
                className="w-full p-3 border border-gray-300 rounded-lg text-left bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <span className="block truncate">
                  {durationOptions.find((d) => d.id === formData.duration).name}
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </span>
              </Listbox.Button>
              <Listbox.Options className="absolute mt-1 w-full bg-white shadow-lg rounded-lg py-1 z-10 max-h-60 overflow-auto">
                {durationOptions.map((d) => (
                  <Listbox.Option
                    key={d.id}
                    value={d.id}
                    className={({ active }) =>
                      `cursor-pointer select-none relative py-2 pl-10 pr-4 ${active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                      }`
                    }
                  >
                    {({ selected }) => (
                      <>
                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                          {d.name}
                        </span>
                        {selected && (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          aria-label="Create Session"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Creating...
            </div>
          ) : (
            'Create Session'
          )}
        </button>
      </form>
    </motion.div>
  );
}