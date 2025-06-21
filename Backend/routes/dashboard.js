// routes/dashboard.js
import express from 'express';
import User from '../models/User.js';
import Session from '../models/Session.js';
import {auth} from '../middleware/auth.js';
import moment from 'moment';
import { Parser } from 'json2csv';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', auth(['admin']), async (req, res) => {
  try {
    const today = moment().startOf('day').toDate();
    const totalUsers = await User.countDocuments();
    const checkInsToday = await Session.aggregate([
      { $unwind: '$attendees' },
      { $match: { 'attendees.timestamp': { $gte: today } } },
      { $count: 'checkIns' },
    ]);
    const suspiciousEntries = await Session.aggregate([
      { $unwind: '$attendees' },
      { $match: { 'attendees.status': 'flagged' } },
      { $count: 'flagged' },
    ]);
    const activeUsers = await Session.aggregate([
      { $unwind: '$attendees' },
      { $match: { 'attendees.timestamp': { $gte: today } } },
      { $group: { _id: '$attendees.userId' } },
      { $count: 'activeUsers' },
    ]);
    const inactiveUsers = totalUsers - (activeUsers[0]?.activeUsers || 0);

    res.json({
      totalUsers,
      checkInsToday: checkInsToday[0]?.checkIns || 0,
      suspiciousEntries: suspiciousEntries[0]?.flagged || 0,
      activeUsers: activeUsers[0]?.activeUsers || 0,
      inactiveUsers,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get analytics data (weekly attendance trends)
router.get('/analytics', auth(['admin']), async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const startDate = moment().subtract(1, period === 'month' ? 'month' : 'week').startOf('day').toDate();
    const endDate = moment().endOf('day').toDate();

    const data = await Session.aggregate([
      { $unwind: '$attendees' },
      { $match: { 'attendees.timestamp': { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$attendees.timestamp' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    const labels = [];
    const counts = [];
    let current = moment(startDate);
    while (current.isSameOrBefore(endDate, 'day')) {
      const dateStr = current.format('YYYY-MM-DD');
      const found = data.find(d => d._id === dateStr);
      labels.push(current.format('ddd'));
      counts.push(found ? found.count : 0);
      current.add(1, 'day');
    }

    res.json({ labels, data: counts });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export dashboard data as CSV
router.get('/export', auth(['admin']), async (req, res) => {
  try {
    const users = await User.find().lean();
    const sessions = await Session.find().lean();
    const fields = [
      { label: 'User ID', value: '_id' },
      { label: 'Name', value: 'name' },
      { label: 'Email', value: 'email' },
      { label: 'Role', value: 'role' },
      { label: 'Status', value: 'status' },
      { label: 'Matric Number', value: 'matricNumber' },
      { label: 'Department', value: 'department' },
      { label: 'Device ID', value: 'deviceId' },
    ];
    const sessionFields = [
      { label: 'Session ID', value: '_id' },
      { label: 'Course ID', value: 'courseId' },
      { label: 'Course Name', value: 'courseName' },
      { label: 'User ID', value: 'attendees.userId' },
      { label: 'Timestamp', value: 'attendees.timestamp' },
      { label: 'Status', value: 'attendees.status' },
      { label: 'Reason', value: 'attendees.reason' },
      { label: 'Latitude', value: 'attendees.latitude' },
      { label: 'Longitude', value: 'attendees.longitude' },
    ];

    const userCsv = new Parser({ fields }).parse(users);
    const sessionData = sessions.flatMap(session =>
      session.attendees.map(attendee => ({
        _id: session._id,
        courseId: session.courseId,
        courseName: session.courseName,
        'attendees.userId': attendee.userId,
        'attendees.timestamp': attendee.timestamp,
        'attendees.status': attendee.status,
        'attendees.reason': attendee.reason,
        'attendees.latitude': attendee.latitude,
        'attendees.longitude': attendee.longitude,
      }))
    );
    const sessionCsv = new Parser({ fields: sessionFields }).parse(sessionData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=dashboard_export.csv');
    res.send(userCsv + '\n\n' + sessionCsv);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;