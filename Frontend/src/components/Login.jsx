// components/Login.js (create or update)
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FingerprintJS from 'fingerprintjs2';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '', deviceId: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    FingerprintJS.get((components) => {
      const values = components.map(component => component.value);
      const fingerprint = FingerprintJS.x64hash128(values.join(''), 31);
      setFormData((prev) => ({ ...prev, deviceId: fingerprint }));
    });
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
          department: user.department
        })
      }));

      if (user.role === 'student') {
        navigate('/student');
      } else if (user.role === 'lecturer') {
        navigate('/lecturer');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-gray-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-3 border border-border rounded focus:outline-none focus:border-primary"
              placeholder="e.g., student@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full p-3 border border-border rounded focus:outline-none focus:border-primary"
              placeholder="Enter your password"
              required
            />
          </div>
          {error && <p className="text-error text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isLoading || !formData.deviceId}
            className={`w-full p-3 bg-primary text-white rounded hover:bg-accent transition-all duration-200 ${isLoading || !formData.deviceId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="text-sm text-center mt-4">
          Don't have an account?{' '}
          <a href="/register" className="text-primary underline hover:text-accent">
            Register
          </a>
        </p>
      </div>
    </motion.div>
  );
}