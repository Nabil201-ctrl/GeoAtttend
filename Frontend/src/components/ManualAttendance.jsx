import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function ManualAttendance({ sessionId, courseId, onAttendanceAdded }) {
  const [formData, setFormData] = useState({
    matricNumber: '',
    reason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [students, setStudents] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Fetch students enrolled in the course
  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoadingStudents(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const course = response.data.find(c => c.courseId === courseId);
        if (course && course.students) {
          const studentDetails = await Promise.all(
            course.students.map(async (studentId) => {
              const userResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              return userResponse.data;
            })
          );
          setStudents(studentDetails);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        showToast('Failed to fetch students', 'error');
      } finally {
        setIsLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [courseId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.matricNumber) {
      showToast('Please select a student', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}/manual-attendance`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('Attendance marked successfully', 'success');
      setFormData({ matricNumber: '', reason: '' });
      onAttendanceAdded();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to mark attendance', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="bg-white p-4 rounded-lg shadow-sm border border-border mt-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-lg font-medium mb-2">Manually Add Attendance</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Student</label>
          <select
            value={formData.matricNumber}
            onChange={(e) => setFormData({ ...formData, matricNumber: e.target.value })}
            className="w-full p-3 border border-border rounded focus:outline-none focus:border-primary"
            disabled={isLoadingStudents}
          >
            <option value="">{isLoadingStudents ? 'Loading students...' : 'Select Student'}</option>
            {students.map((student) => (
              <option key={student._id} value={student.matricNumber}>
                {student.name} ({student.matricNumber})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
          <input
            type="text"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            className="w-full p-3 border border-border rounded focus:outline-none focus:border-primary"
            placeholder="e.g., Late arrival"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full p-3 text-white rounded transition-all duration-200 ${
            isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-accent'
          }`}
        >
          {isSubmitting ? 'Adding...' : 'Add Attendance'}
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