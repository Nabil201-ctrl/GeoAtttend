// components/ManualAttendance.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { CheckCircle } from 'lucide-react';

export default function ManualAttendance({ courseId, sessionId }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses/${courseId}/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStudents(response.data);
      } catch (error) {
        showToast(error.response?.data?.message || 'Failed to fetch students', 'error');
      }
    };
    fetchStudents();
  }, [courseId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      showToast('Please select a student', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/courses/${courseId}/sessions/${sessionId}/attendance`,
        { studentId: selectedStudent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('Attendance recorded successfully');
      setSelectedStudent('');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to record attendance', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Manual Attendance</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">Manually mark attendance for a student</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">Select Student</option>
          {students.map(student => (
            <option key={student._id} value={student._id}>{student.name} ({student.matricNumber})</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full p-3 text-white rounded-lg transition duration-200 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isSubmitting ? 'Recording...' : <><CheckCircle className="w-5 h-5 inline mr-2" /> Record Attendance</>}
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