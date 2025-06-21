// index.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import userRoutes from './routes/users.js';
import sessionRoutes from './routes/sessions.js';
import courseRoutes from './routes/courses.js';

dotenv.config();
console.log('MONGO_URI:', process.env.MONGO_URI); // Debug log

const app = express();

app.use(cors());
app.use(express.json());

// Initialize GridFS
let gfs;
mongoose.connection.once('open', () => {
  console.log('MongoDB connection opened'); // Debug log
  gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'Uploads' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/courses', courseRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));