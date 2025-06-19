// components/Register.js
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FingerprintJS from 'fingerprintjs2';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    matricNumber: '',
    department: '',
    deviceId: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Generate device ID
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
      const response = await axios.post('/api/auth/register', formData);
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
      setError(err.response?.data?.message || 'Registration failed');
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
        <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 border border-border rounded focus:outline-none focus:border-primary"
              placeholder="e.g., John Doe"
              required
            />
          </div>
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
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full p-3 border border-border rounded focus:outline-none focus:border-primary"
            >
              <option value="student">Student</option>
              <option value="lecturer">Lecturer</option>
            </select>
          </div>
          {formData.role === 'student' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Matric Number</label>
                <input
                  type="text"
                  value={formData.matricNumber}
                  onChange={(e) => setFormData({ ...formData, matricNumber: e.target.value })}
                  className="w-full p-3 border border-border rounded focus:outline-none focus:border-primary"
                  placeholder="e.g., 23/208CSC/586"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full p-3 border border-border rounded focus:outline-none focus:border-primary"
                  placeholder="e.g., Computer Science"
                  required
                />
              </div>
            </>
          )}
          {error && <p className="text-error text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isLoading || !formData.deviceId}
            className={`w-full p-3 bg-primary text-white rounded hover:bg-accent transition-all duration-200 ${isLoading || !formData.deviceId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="text-sm text-center mt-4">
          Already have an account?{' '}
          <a href="/" className="text-primary underline hover:text-accent">
            Login
          </a>
        </p>
      </div>
    </motion.div>
  );
}