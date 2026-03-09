import { Request, Response, NextFunction } from 'express';
import { createClient, User } from '@supabase/supabase-js';

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

        // Check if user exists in our public.users table
        const { data: publicUser, error: publicUserError } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single();

        if (publicUserError && publicUserError.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('Error fetching public user:', publicUserError);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        // If user does not exist, create them
        if (!publicUser) {
            const walletAddress = user.user_metadata.wallet_address; // Correctly access wallet_address
            const { error: insertError } = await supabase
                .from('users')
                .insert({ id: user.id, wallet_address: walletAddress });

            if (insertError) {
                console.error('Error creating public user:', insertError);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
        }

        req.user = { sub: user.id };
        next();

    } catch (error: any) {
        console.error('Unexpected error in authentication middleware:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
