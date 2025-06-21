// components/AttendanceRecords.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Filter, Download } from 'lucide-react';

export default function AttendanceRecords({ courseId, courseName }) {
  const [records, setRecords] = useState([]);
  const [attendanceByStudent, setAttendanceByStudent] = useState([]);
  const [filters, setFilters] = useState({ date: '', studentId: '' });
  const [students, setStudents] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const params = {};
        if (filters.date) params.date = filters.date;
        if (filters.studentId) params.studentId = filters.studentId;
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses/${courseId}/attendance`, {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });
        setRecords(response.data.sessions);
        setAttendanceByStudent(response.data.attendanceByStudent);
        const studentResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses/${courseId}/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStudents(studentResponse.data);
      } catch (error) {
        showToast(error.response?.data?.message || 'Failed to fetch attendance records', 'error');
      }
    };
    fetchData();
  }, [courseId, filters]);

  const handleExport = async (format) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses/${courseId}/attendance/export/${format}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${courseId}_attendance.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast(`${format.toUpperCase()} downloaded successfully`);
    } catch (error) {
      showToast(error.response?.data?.message || `Failed to download ${format}`, 'error');
    }
  };

  return (
    <motion.div
      className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Attendance Records - {courseName}</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">View and filter attendance history</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input
          type="date"
          value={filters.date}
          onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
          className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
        <select
          value={filters.studentId}
          onChange={(e) => setFilters(prev => ({ ...prev, studentId: e.target.value }))}
          className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">All Students</option>
          {students.map(student => (
            <option key={student._id} value={student._id}>{student.name}</option>
          ))}
        </select>
      </div>
      <div className="flex space-x-3 mb-6">
        <button
          onClick={() => handleExport('csv')}
          className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
        >
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </button>
        <button
          onClick={() => handleExport('pdf')}
          className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Download className="w-4 h-4 mr-2" /> Export PDF
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Matric Number</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {records.map((record) => (
              <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{record.userId.name}</td>
                <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{record.userId.matricNumber}</td>
                <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{new Date(record.timestamp).toLocaleString()}</td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    record.status === 'valid'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Attendance Summary by Student</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Matric Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sessions Attended</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {attendanceByStudent.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{student.name}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{student.matricNumber}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{student.attended}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{student.percentage.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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