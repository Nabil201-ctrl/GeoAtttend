import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function CreateCourse({ refreshCourses }) {
  const [formData, setFormData] = useState({
    courseId: '',
    name: '',
    department: '',
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.courseId) newErrors.courseId = 'Course ID is required';
    if (!formData.name) newErrors.name = 'Course name is required';
    if (!formData.department) newErrors.department = 'Department is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setToastMessage('Please fill in all required fields');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    try {
      const response = await axios.post(
        '/api/courses',
        formData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      setToastMessage('Course created successfully!');
      setToastType('success');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      setFormData({ courseId: '', name: '', department: '' });
      setErrors({});
      refreshCourses();
    } catch (error) {
      setToastMessage(error.response?.data?.message || 'Failed to create course');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  return (
    <motion.div
      className="bg-white p-6 rounded-lg shadow-sm border border-border"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <h2 className="text-xl font-semibold mb-2">Create New Course</h2>
      <p className="text-textSecondary mb-4 text-sm">Add a new course to your teaching schedule</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Course ID</label>
          <input
            type="text"
            value={formData.courseId}
            onChange={(e) => {
              setFormData({ ...formData, courseId: e.target.value });
              setErrors((prev) => ({ ...prev, courseId: '' }));
            }}
            className={`w-full p-3 border rounded focus:outline-none focus:border-primary ${
              errors.courseId ? 'border-error' : 'border-border'
            }`}
            placeholder="e.g., CS101"
          />
          {errors.courseId && <p className="text-error text-xs mt-1">{errors.courseId}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Course Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              setErrors((prev) => ({ ...prev, name: '' }));
            }}
            className={`w-full p-3 border rounded focus:outline-none focus:border-primary ${
              errors.name ? 'border-error' : 'border-border'
            }`}
            placeholder="e.g., Introduction to Computer Science"
          />
          {errors.name && <p className="text-error text-xs mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Department</label>
          <input
            type="text"
            value={formData.department}
            onChange={(e) => {
              setFormData({ ...formData, department: e.target.value });
              setErrors((prev) => ({ ...prev, department: '' }));
            }}
            className={`w-full p-3 border rounded focus:outline-none focus:border-primary ${
              errors.department ? 'border-error' : 'border-border'
            }`}
            placeholder="e.g., Computer Science"
          />
          {errors.department && <p className="text-error text-xs mt-1">{errors.department}</p>}
        </div>
        <button
          type="submit"
          className="w-full p-3 bg-primary text-white rounded hover:bg-accent active:scale-95 transition-all duration-200"
        >
          Create Course
        </button>
      </form>
      {showToast && (
        <motion.div
          className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            toastType === 'success' ? 'bg-success text-white' : 'bg-error text-white'
          }`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          {toastMessage}
        </motion.div>
      )}
    </motion.div>
  );
}