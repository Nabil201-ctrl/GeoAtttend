// components/StudentList.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Users, Eye, Download } from 'lucide-react';
import Modal from './AdminDashboard.jsx'; // Reuse Modal

export default function StudentList({ courseId, courseName }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const handleViewAttendance = async (studentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses/${courseId}/students/${studentId}/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAttendanceRecords(response.data.sessions);
      setSelectedStudent({ ...students.find(s => s._id === studentId), attendancePercentage: response.data.attendancePercentage });
      setIsModalOpen(true);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch attendance', 'error');
    }
  };

  return (
    <motion.div
      className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Student List - {courseName}</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">View enrolled students and their attendance records</p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Matric Number</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {students.map((student) => (
              <tr key={student._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{student.name}</td>
                <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{student.matricNumber}</td>
                <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{student.status || 'active'}</td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => handleViewAttendance(student._id)}
                    className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Attendance Records - ${selectedStudent?.name}`}
      >
        {selectedStudent && (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Matric Number: {selectedStudent.matricNumber}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Attendance Percentage: {selectedStudent.attendancePercentage}%</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {attendanceRecords.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{new Date(record.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{record.status}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{record.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
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