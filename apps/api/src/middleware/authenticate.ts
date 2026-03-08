import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Extend the Express Request interface to include a user object
declare global {
    namespace Express {
        interface Request {
            user?: { userId: string };
        }
    }
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('Authentication error:', error?.message);
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        req.user = { userId: user.id };
        next();

    } catch (error: any) {
        console.error('Unexpected error in authentication middleware:', error);
        return res.status(5.0).json({ error: 'Internal Server Error' });
    }
};
