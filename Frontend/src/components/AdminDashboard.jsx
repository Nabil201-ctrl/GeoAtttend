// components/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import StatsCard from './StatsCard.jsx';
import { Line } from 'react-chartjs-2';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    checkInsToday: 0,
    suspiciousEntries: 0,
    activeUsers: 0,
    inactiveUsers: 0,
  });
  const [users, setUsers] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [flaggedEntries, setFlaggedEntries] = useState([]);
  const [deviceFingerprints, setDeviceFingerprints] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({
    labels: [],
    datasets: [],
  });
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [filters, setFilters] = useState({
    user: '',
    date: '',
    status: '',
    device: '',
  });
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();
  const localizer = momentLocalizer(moment);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/');
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // Fetch stats
        const statsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/stats`, { headers });
        setStats(statsRes.data);

        // Fetch users
        const usersRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/users`, { headers });
        setUsers(usersRes.data);

        // Fetch attendance logs
        const logsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/sessions/logs`, { headers });
        setAttendanceLogs(logsRes.data);

        // Fetch flagged entries
        const flaggedRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/sessions/flagged`, { headers });
        setFlaggedEntries(flaggedRes.data);

        // Fetch device fingerprints
        const devicesRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/devices`, { headers });
        setDeviceFingerprints(devicesRes.data);

        // Fetch analytics data
        const analyticsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/analytics?period=week`, { headers });
        setAnalyticsData({
          labels: analyticsRes.data.labels,
          datasets: [
            {
              label: 'Attendance',
              data: analyticsRes.data.data,
              borderColor: '#3b82f6',
              fill: false,
            },
          ],
        });

        // Fetch calendar events
        const eventsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/sessions/events`, { headers });
        setCalendarEvents(eventsRes.data.map(event => ({
          title: `${event.courseId} - ${event.courseName}`,
          start: new Date(event.startTime),
          end: new Date(event.endTime),
        })));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/');
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [navigate]);

  useEffect(() => {
    // Apply dark mode
    const preference = localStorage.getItem('theme') === 'dark';
    setDarkMode(preference);
    document.documentElement.classList.toggle('dark', preference);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', newMode);
      return newMode;
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleUserAction = async (action, userData) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (action === 'add') {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/users`, userData, { headers });
      } else if (action === 'edit') {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/users/${userData._id}`, userData, { headers });
      } else if (action === 'delete') {
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/users/${userData._id}`, { headers });
      }

      // Refresh users
      const usersRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/users`, { headers });
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error in user action:', error);
    }
  };

  const filteredAttendanceLogs = attendanceLogs.filter(log => (
    (!filters.user || log.userId._id.toString() === filters.user) &&
    (!filters.date || new Date(log.timestamp).toISOString().split('T')[0] === filters.date) &&
    (!filters.status || log.status === filters.status) &&
    (!filters.device || log.deviceId === filters.device)
  ));

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <Header />
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8 flex-grow"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-textSecondary text-sm md:text-base dark:text-gray-400">
              Manage users, attendance, and system analytics.
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 bg-primary text-white rounded-lg hover:bg-accent transition-all duration-200"
            >
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button
              onClick={() => navigate('/register')}
              className="p-2 bg-secondary text-white rounded-lg hover:bg-accent transition-all duration-200"
            >
              Add User
            </button>
          </div>
        </div>

        {/* Dashboard Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatsCard title="Total Users" value={stats.totalUsers} subtitle="All registered users" icon="people" />
          <StatsCard title="Check-ins Today" value={stats.checkInsToday} subtitle="Today’s attendance" icon="schedule" />
          <StatsCard title="Suspicious Entries" value={stats.suspiciousEntries} subtitle="Flagged entries" icon="warning" />
          <StatsCard title="Active Users" value={stats.activeUsers} subtitle="Users active today" icon="people" />
          <StatsCard title="Inactive Users" value={stats.inactiveUsers} subtitle="Users not active" icon="people" />
        </div>

        {/* User Management */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">User Management</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Name</th>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Email</th>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Role</th>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map(user => (
                  <tr key={user._id}>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{user.name}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{user.email}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{user.role}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleUserAction('edit', { ...user, role: user.role === 'student' ? 'lecturer' : 'student' })}
                        className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                      >
                        Edit Role
                      </button>
                      <button
                        onClick={() => handleUserAction('delete', { _id: user._id })}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendance Logs */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Attendance Logs</h2>
          <div className="mb-4 flex flex-wrap gap-4">
            <select
              name="user"
              value={filters.user}
              onChange={handleFilterChange}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>{user.name}</option>
              ))}
            </select>
            <input
              name="date"
              type="date"
              value={filters.date}
              onChange={handleFilterChange}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
            />
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="valid">Valid</option>
              <option value="flagged">Flagged</option>
            </select>
            <input
              name="device"
              value={filters.device}
              onChange={handleFilterChange}
              placeholder="Device ID"
              className="p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">User</th>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Timestamp</th>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Device ID</th>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Location</th>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAttendanceLogs.map(log => (
                  <tr key={log._id}>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{log.userId.name}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{log.deviceId}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{`${log.latitude}, ${log.longitude}`}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{log.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Flagged Entries */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Flagged Entries</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">User</th>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Timestamp</th>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {flaggedEntries.map(entry => (
                  <tr key={entry._id}>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{entry.userId.name}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{new Date(entry.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Device Fingerprint Tracking */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Device Fingerprint Tracking</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">User</th>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Device ID</th>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Last Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {deviceFingerprints.map(device => (
                  <tr key={device._id}>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{device.userId.name}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{device.deviceId}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{new Date(device.lastUsed).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Analytics */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Attendance Analytics</h2>
          <Line data={analyticsData} options={{ responsive: true }} />
        </div>

        {/* User Activity Timeline */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">User Activity Timeline</h2>
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500 }}
            className="dark:bg-gray-800 dark:text-white"
          />
        </div>
      </motion.main>
      <Footer />
    </div>
  );
}