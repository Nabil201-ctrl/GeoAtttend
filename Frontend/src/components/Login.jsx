// components/Login.js
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '', deviceId: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize FingerprintJS and get visitor ID
    const getFingerprint = async () => {
      try {
        // Load FingerprintJS
        const fp = await FingerprintJS.load();
        // Get the visitor identifier
        const result = await fp.get();
        setFormData((prev) => ({ ...prev, deviceId: result.visitorId }));
      } catch (err) {
        console.error('Error generating device ID:', err);
        setError('Failed to generate device ID. Please try again.');
      }
    };

    getFingerprint();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!formData.deviceId) {
      setError('Device ID not generated. Please try again.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, formData);
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

      if (user.role === 'student') {
        navigate('/student');
      } else if (user.role === 'lecturer') {
        navigate('/lecturer');
      } else if (user.role === 'admin') {
        navigate('/admin');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
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
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., student@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter your password"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isLoading || !formData.deviceId}
            className={`w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 ${isLoading || !formData.deviceId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="text-sm text-center mt-4 text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <a href="/register" className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            Register
          </a>
        </p>
      </div>
    </motion.div>
  );
}