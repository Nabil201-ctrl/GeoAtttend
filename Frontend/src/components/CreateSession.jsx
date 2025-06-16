import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Listbox } from '@headlessui/react';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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
    { id: 'hall-45', name: 'Around Hall (45m)', radius: 45, svg: '<circle cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" stroke-width="2"/>' },
    { id: 'building-100', name: 'Around Building (100m)', radius: 100, svg: '<circle cx="50" cy="50" r="100" fill="none" stroke="#3b82f6" stroke-width="2"/>' },
    { id: 'campus-200', name: 'Campus Area (200m)', radius: 200, svg: '<circle cx="50" cy="50" r="200" fill="none" stroke="#3b82f6" stroke-width="2"/>' },
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
          showToast('Please log in again', 'error');
          navigate('/');
          return;
        }
        const response = await axios.get('/api/courses', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCourses(response.data.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        showToast(error.response?.data?.message || 'Failed to fetch courses', 'error');
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
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6),
          });
          setErrors((prev) => ({ ...prev, latitude: '', longitude: '' }));
          setIsLoadingLocation(false);
        },
        (error) => {
          let message = 'Failed to get location';
          if (error.code === error.PERMISSION_DENIED) {
            message = 'Location access denied. Please enable it in your browser settings.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = 'Location information is unavailable.';
          }
          showToast(message, 'error');
          setIsLoadingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      showToast('Geolocation is not supported by this browser', 'error');
      setIsLoadingLocation(false);
    }
  };

  const generatePasscode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const passcode = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setFormData({ ...formData, passcode });
    setErrors((prev) => ({ ...prev, passcode: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.courseId) newErrors.courseId = 'Please select a course';
    if (!formData.passcode) newErrors.passcode = 'Passcode is required';
    if (!formData.latitude) newErrors.latitude = 'Latitude is required';
    if (!formData.longitude) newErrors.longitude = 'Longitude is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedGeofence = geofenceOptions.find((g) => g.id === formData.geofence);
      const selectedDuration = durationOptions.find((d) => d.id === formData.duration);
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + selectedDuration.minutes * 60 * 1000);

      const response = await axios.post(
        '/api/sessions',
        {
          ...formData,
          location: { latitude: parseFloat(formData.latitude), longitude: parseFloat(formData.longitude) },
          radius: selectedGeofence.radius,
          startTime,
          endTime,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      setActiveSessions((prev) => [...prev, response.data]);
      showToast('Session created successfully!');
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
    <motion.div
      className="bg-white p-6 rounded-lg shadow-sm border border-border"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <h2 className="text-xl font-semibold mb-2">Create New Session</h2>
      <p className="text-textSecondary mb-4 text-sm">Set up a new attendance session for your course</p>
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
              });
              setErrors((prev) => ({ ...prev, courseId: '' }));
            }}
            className={`w-full p-3 border rounded focus:outline-none focus:border-primary ${
              errors.courseId ? 'border-error' : 'border-border'
            }`}
            disabled={isLoadingCourses}
          >
            <option value="">{isLoadingCourses ? 'Loading courses...' : 'Select Course'}</option>
            {courses.length > 0 ? (
              courses.map((course) => (
                <option key={course.courseId} value={course.courseId}>
                  {course.name} (by {course.lecturerName})
                </option>
              ))
            ) : (
              <option value="" disabled>
                No courses available
              </option>
            )}
          </select>
          {errors.courseId && <p className="text-error text-xs mt-1">{errors.courseId}</p>}
          {courses.length === 0 && !isLoadingCourses && (
            <p className="text-sm mt-2">
              No courses found.{' '}
              <button
                type="button"
                onClick={() => document.getElementById('create-course-section').scrollIntoView({ behavior: 'smooth' })}
                className="text-primary underline hover:text-accent"
              >
                Create a course
              </button>
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Passcode</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={formData.passcode}
              onChange={(e) => {
                setFormData({ ...formData, passcode: e.target.value });
                setErrors((prev) => ({ ...prev, passcode: '' }));
              }}
              className={`w-full p-3 border rounded focus:outline-none focus:border-primary ${
                errors.passcode ? 'border-error' : 'border-border'
              }`}
              placeholder="e.g., CS101-123"
            />
            <button
              type="button"
              onClick={generatePasscode}
              className="p-3 bg-secondary text-white rounded hover:bg-accent"
            >
              Generate
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
              className={`w-full p-3 border rounded focus:outline-none focus:border-primary ${
                errors.latitude ? 'border-error' : 'border-border'
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
              className={`w-full p-3 border rounded focus:outline-none focus:border-primary ${
                errors.longitude ? 'border-error' : 'border-border'
              }`}
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
          {(errors.latitude || errors.longitude) && (
            <p className="text-error text-xs mt-1">{errors.latitude || errors.longitude}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Geofence Size</label>
          <Listbox value={formData.geofence} onChange={(value) => setFormData({ ...formData, geofence: value })}>
            <div className="relative">
              <Listbox.Button className="w-full p-3 border border-border rounded-lg text-left bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                <span className="block truncate">
                  {geofenceOptions.find((g) => g.id === formData.geofence).name}
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                </span>
              </Listbox.Button>
              <Listbox.Options className="absolute mt-1 w-full bg-white shadow-lg rounded-lg py-1 z-10">
                {geofenceOptions.map((g) => (
                  <Listbox.Option
                    key={g.id}
                    value={g.id}
                    className={({ active }) =>
                      `cursor-pointer select-none relative py-2 pl-10 pr-4 flex items-center ${
                        active ? 'bg-secondary text-primary' : 'text-gray-900'
                      }`
                    }
                  >
                    {({ selected }) => (
                      <>
                        <svg className="h-6 w-6 mr-2" viewBox="0 0 100 100" dangerouslySetInnerHTML={{ __html: g.svg }} />
                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                          {g.name}
                        </span>
                        {selected && (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                            <CheckIcon className="h-5 w-5" />
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
          <label className="block text-sm font-medium mb-1">Session Duration</label>
          <Listbox value={formData.duration} onChange={(value) => setFormData({ ...formData, duration: value })}>
            <div className="relative">
              <Listbox.Button className="w-full p-3 border border-border rounded-lg text-left bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                <span className="block truncate">
                  {durationOptions.find((d) => d.id === formData.duration).name}
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                </span>
              </Listbox.Button>
              <Listbox.Options className="absolute mt-1 w-full bg-white shadow-lg rounded-lg py-1 z-10">
                {durationOptions.map((d) => (
                  <Listbox.Option
                    key={d.id}
                    value={d.id}
                    className={({ active }) =>
                      `cursor-pointer select-none relative py-2 pl-10 pr-4 ${
                        active ? 'bg-secondary text-primary' : 'text-gray-900'
                      }`
                    }
                  >
                    {({ selected }) => (
                      <>
                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                          {d.name}
                        </span>
                        {selected && (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                            <CheckIcon className="h-5 w-5" />
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
          className={`w-full p-3 bg-primary text-white rounded hover:bg-accent active:scale-95 transition-all duration-200 ${
            isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? 'Creating...' : 'Create Session'}
        </button>
      </form>
      {toast.show && (
        <motion.div
          className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            toast.type === 'success' ? 'bg-success text-white' : 'bg-error text-white'
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