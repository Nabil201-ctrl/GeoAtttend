// middleware/auth.js
import jwt from 'jsonwebtoken';

export const auth = (roles = []) => {
  return async (req, res, next) => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // Attach decoded user data (id, role) to req.user

      // Check if user has required role
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Access denied: insufficient permissions' });
      }

      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      console.error('Auth middleware error:', error);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
};