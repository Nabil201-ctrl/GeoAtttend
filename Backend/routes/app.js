import cron from 'node-cron';
import Session from './models/Session.js';
import { createObjectCsvWriter } from 'csv-writer';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs/promises';

// Schedule job to check expired sessions every minute
cron.schedule('* * * * *', async () => {
  try {
    console.log('Checking for expired sessions...');
    const now = new Date();
    const sessions = await Session.find({
      endTime: { $lte: now },
      reportGenerated: false,
      lecturerId: { $exists: true },
    }).populate('attendees.userId', 'name department matricNumber');

    for (const session of sessions) {
      const attendees = session.attendees.map(attendee => ({
        name: attendee.userId?.name || 'Unknown',
        department: attendee.userId?.department || 'N/A',
        matricNumber: attendee.userId?.matricNumber || 'N/A',
        timestamp: attendee.timestamp?.toLocaleString() || 'N/A',
      }));

      if (attendees.length === 0) {
        await Session.updateOne(
          { _id: session._id },
          { reportGenerated: true }
        );
        continue;
      }

      const uploadsDir = path.join('uploads');
      await fs.mkdir(uploadsDir, { recursive: true });

      const csvFilePath = path.join(uploadsDir, `session_${session._id}_attendees.csv`);
      const pdfFilePath = path.join(UploadsDir, `session_${session._id}_attendees.pdf`);

      // Generate CSV
      const csvWriter = createObjectCsvWriter({
        path: csvFilePath,
        header: [
          { id: 'name', title: 'Name' },
          { id: 'department', title: 'Department' },
          { id: 'matricNumber', title: 'Matric Number' },
          { id: 'timestamp', title: 'Timestamp' },
        ],
      });
      await csvWriter.writeRecords(attendees);

      // Generate PDF
      const doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(pdfFilePath));
      doc.fontSize(16).text(`Attendance Report for ${session.courseName}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Session ID: ${session._id}`);
      doc.text(`Course: ${session.courseId}`);
      doc.text(`Date: ${session.startTime.toLocaleString()}`);
      doc.moveDown();
      attendees.forEach((attendee, index) => {
        doc.text(
          `${index + 1}. Name: ${attendee.name}, Matric: ${attendee.matricNumber}, Dept: ${attendee.department}, Time: ${attendee.timestamp}`
        );
        doc.moveDown(0.5);
      });
      doc.end();

      // Update session
      await Session.updateOne(
        { _id: session._id },
        {
          reportGenerated: true,
          reportFiles: {
            csv: `/api/sessions/download/${session._id}/csv`,
            pdf: `/api/sessions/download/${session._id}/pdf`,
          },
        }
      );
      console.log(`Reports generated for expired session ${session._id}`);
    }
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});