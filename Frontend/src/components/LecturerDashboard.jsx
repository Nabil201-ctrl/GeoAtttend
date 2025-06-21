// components/LecturerDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from './Header.jsx';
import StatsCard from './StatsCard.jsx';
import CreateSession from './CreateSession.jsx';
import CreateCourse from './CreateCourse.jsx';
import ActiveSessions from './ActiveSessions.jsx';
import RecentSessions from './RecentSessions.jsx';
import StudentImport from './StudentImport.jsx';
import UploadMaterial from './UploadMaterial.jsx';
import StudentList from './StudentList.jsx';
import AttendanceRecords from './AttendanceRecords.jsx';
import Footer from './Footer.jsx';
import axios from 'axios';

export default function LecturerDashboard() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/');
          return;
        }

        const sessionsResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/sessions/active`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setActiveSessions(sessionsResponse.data);

        const coursesResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCourses(coursesResponse.data);
        if (coursesResponse.data.length > 0 && !selectedCourse) {
          setSelectedCourse(coursesResponse.data[0].courseId);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/');
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [navigate, selectedCourse]);

  const refreshCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(response.data);
      if (response.data.length > 0 && !selectedCourse) {
        setSelectedCourse(response.data[0].courseId);
      }
    } catch (error) {
      console.error('Error refreshing courses:', error);
    }
  };

  const stats = [
    {
      title: 'Active Sessions',
      value: activeSessions.length,
      subtitle: 'Currently running sessions',
      icon: 'schedule',
    },
    {
      title: 'Total Courses',
      value: courses.length,
      subtitle: 'Courses assigned this semester',
      icon: 'menu_book',
    },
    {
      title: 'Total Students',
      value: courses.reduce((sum, course) => sum + (course.enrolledStudentIds?.length || 0), 0),
      subtitle: 'Enrolled across all courses',
      icon: 'people',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col dark:bg-gray-900">
      <Header />
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8 flex-grow"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-white">Lecturer Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
              Welcome back, Manage your courses and sessions below.
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => navigate('/register')}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              Register Lecturer
            </button>
            <button
              onClick={() => document.getElementById('create-course-section').scrollIntoView({ behavior: 'smooth' })}
              className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200"
            >
              Create Course
            </button>
          </div>
        </div>

        <div className="mb-6">
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select Course</option>
            {courses.map(course => (
              <option key={course.courseId} value={course.courseId}>
                {course.name} ({course.courseId})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {stats.map((stat, index) => (
            <StatsCard
              key={index}
              title={stat.title}
              value={stat.value}
              subtitle={stat.subtitle}
              icon={stat.icon}
            />
          ))}
        </div>

        <div id="create-course-section" className="mb-6">
          <CreateCourse refreshCourses={refreshCourses} />
        </div>

        {selectedCourse && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <CreateSession setActiveSessions={setActiveSessions} refreshCourses={refreshCourses} />
              <ActiveSessions sessions={activeSessions.filter(s => s.courseId === selectedCourse)} setActiveSessions={setActiveSessions} />
            </div>

            <div className="mb-6">
              <UploadMaterial courseId={selectedCourse} refreshCourses={refreshCourses} />
            </div>

            <div className="mb-6">
              <StudentList courseId={selectedCourse} courseName={courses.find(c => c.courseId === selectedCourse)?.name || ''} />
            </div>

            <div className="mb-6">
              <AttendanceRecords courseId={selectedCourse} courseName={courses.find(c => c.courseId === selectedCourse)?.name || ''} />
            </div>
          </>
        )}

        <div className="mb-6">
          <StudentImport />
        </div>

        <RecentSessions sessions={activeSessions} setActiveSessions={setActiveSessions} refreshCourses={refreshCourses} showAlert={showToast} />
      </motion.main>
      <Footer />
    </div>
  );

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  }
}