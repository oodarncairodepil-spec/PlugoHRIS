import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../utils/supabase';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'Employee' | 'Manager' | 'Admin';
    full_name: string;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Fetch user details from Supabase
    const { data: employee, error } = await supabase
      .from('employees')
      .select('id, email, role, full_name, status')
      .eq('id', decoded.userId)
      .eq('status', 'Active')
      .single();

    if (error || !employee) {
      return res.status(401).json({ error: 'Invalid token or inactive user' });
    }

    req.user = {
      id: employee.id,
      email: employee.email,
      role: employee.role,
      full_name: employee.full_name
    };

    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Middleware specifically for Admin operations
export const requireHR = requireRole(['Admin']);

// Middleware for Manager and Admin operations
export const requireManagerOrHR = requireRole(['Manager', 'Admin']);

// Middleware for all authenticated users
export const requireAuth = authenticateToken;