// components/StudentImport.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Upload } from 'lucide-react';

export default function StudentImport() {
  const [file, setFile] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [courses, setCourses] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCourses(response.data);
      } catch (error) {
        showToast(error.response?.data?.message || 'Failed to fetch courses', 'error');
      }
    };
    fetchCourses();
  }, []);

  const handleImport = async (e) => {
    e.preventDefault();
    if (!file || !courseId) {
      showToast('Please select a course and file', 'error');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/courses/${courseId}/students`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      showToast('Students imported successfully');
      setFile(null);
      setCourseId('');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to import students', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div
      className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Import Students</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">Upload a CSV to enroll students in a course</p>
      <form onSubmit={handleImport} className="space-y-4">
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">Select Course</option>
          {courses.map(course => (
            <option key={course.courseId} value={course.courseId}>
              {course.name} ({course.courseId})
            </option>
          ))}
        </select>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
        <button
          type="submit"
          disabled={isUploading}
          className={`w-full p-3 text-white rounded-lg transition duration-200 ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isUploading ? 'Importing...' : <><Upload className="w-5 h-5 inline mr-2" /> Import Students</>}
        </button>
      </form>
      {toast.show && (
        <motion.div
          className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
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