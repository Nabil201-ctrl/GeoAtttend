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
import Footer from './Footer.jsx';
import axios from 'axios';

export default function LecturerDashboard() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/');
          return;
        }

        const sessionsResponse = await axios.get('https://geoattend1.onrender.com/api/sessions/active', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setActiveSessions(sessionsResponse.data);

        const coursesResponse = await axios.get('https://geoattend1.onrender.com/api/courses', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCourses(coursesResponse.data);
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
  }, [navigate]);

  const refreshCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('https://geoattend1.onrender.com/api/courses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(response.data);
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
      value: courses.reduce((sum, course) => sum + (course.students?.length || 0), 0),
      subtitle: 'Enrolled across all courses',
      icon: 'people',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8 flex-grow"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Lecturer Dashboard</h1>
            <p className="text-textSecondary text-sm md:text-base">
              Welcome back, Manage your courses and sessions below.
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => navigate('/register')}
              className="p-2 bg-primary text-white rounded-lg hover:bg-accent transition-all duration-200"
            >
              Register Lecturer
            </button>
            <button
              onClick={() => document.getElementById('create-course-section').scrollIntoView({ behavior: 'smooth' })}
              className="p-2 bg-secondary text-white rounded-lg hover:bg-accent transition-all duration-200"
            >
              Create Course
            </button>
          </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <CreateSession setActiveSessions={setActiveSessions} refreshCourses={refreshCourses} />
          <ActiveSessions sessions={activeSessions} setActiveSessions={setActiveSessions} />
        </div>

        <div className="mb-6">
          <StudentImport />
        </div>

        <RecentSessions sessions={activeSessions} />
      </motion.main>
      <Footer />
    </div>
  );
}