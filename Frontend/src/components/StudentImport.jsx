import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function StudentImport() {
  const [courseId, setCourseId] = useState('');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courseId || !file) {
      showToast('Please select a course and file', 'error');
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/courses/${courseId}/students`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      showToast(`Imported ${response.data.count} students successfully!`);
      setCourseId('');
      setFile(null);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to import students', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="bg-white p-6 rounded-lg shadow-sm border border-border"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-xl font-semibold mb-2">Import Students</h2>
      <p className="text-textSecondary mb-4 text-sm">Upload a CSV file to enroll students in a course</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Course ID</label>
          <input
            type="text"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full p-3 border border-border rounded focus:outline-none focus:border-primary"
            placeholder="e.g., CS101"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full p-3 border border-border rounded focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full p-3 bg-primary text-white rounded hover:bg-accent transition-all duration-200 ${
            isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? 'Importing...' : 'Import Students'}
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