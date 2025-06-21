// components/Register.js
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    matricNumber: '',
    department: '',
    deviceId: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Generate device fingerprint
    FingerprintJS.load().then((fp) => {
      fp.get().then((result) => {
        setFormData((prev) => ({ ...prev, deviceId: result.visitorId }));
      });
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!formData.deviceId) {
      setError('Device fingerprint not generated. Please try again.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, formData);
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        deviceId: user.deviceId,
        ...(user.role === 'student' && {
          matricNumber: user.matricNumber,
          department: user.department,
        }),
      }));

      // Redirect based on role
      const routes = {
        student: '/student',
        lecturer: '/lecturer',
        admin: '/admin',
      };
      navigate(routes[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Register</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-primary dark:bg-gray-700 dark:text-white"
              placeholder="e.g., John Doe"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-primary dark:bg-gray-700 dark:text-white"
              placeholder="e.g., student@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-primary dark:bg-gray-700 dark:text-white"
              placeholder="Enter your password"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-primary dark:bg-gray-700 dark:text-white"
            >
              <option value="student">Student</option>
              <option value="lecturer">Lecturer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {formData.role === 'student' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Matric Number</label>
                <input
                  type="text"
                  value={formData.matricNumber}
                  onChange={(e) => setFormData({ ...formData, matricNumber: e.target.value })}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-primary dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., 23/208CSC/586"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-primary dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Computer Science"
                  required
                />
              </div>
            </>
          )}
          {error && <p className="text-error text-sm dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={isLoading || !formData.deviceId}
            className={`w-full p-3 bg-primary text-white rounded hover:bg-accent transition-all duration-200 ${isLoading || !formData.deviceId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="text-sm text-center mt-4 text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <a href="/" className="text-primary underline hover:text-accent dark:text-blue-400 dark:hover:text-blue-300">
            Login
          </a>
        </p>
      </div>
    </motion.div>
  );
}