import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '../../middleware/authenticate'; // Assuming you have an authentication middleware

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * @swagger
 * /points:
 *   get:
 *     summary: Get user points and level
 *     description: Retrieves the current user's total points and level from the database.
 *     tags: [Points]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user points.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_points: 
 *                   type: integer
 *                   example: 1250
 *                 level: 
 *                   type: integer
 *                   example: 2
 *                 nextLevelPoints:
 *                   type: integer
 *                   example: 2500
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
router.get('/', authenticate, async (req, res) => {
  const { userId } = req.user; // From `authenticate` middleware

  try {
    const { data, error } = await supabase
      .from('user_points')
      .select('total_points, level')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const userPoints = data || {
      total_points: 0,
      level: 1,
    };
    
    const nextLevelPoints = (userPoints.level * 1000) + (userPoints.level > 1 ? (userPoints.level - 1) * 500 : 0);

    res.json({ ...userPoints, nextLevelPoints });

  } catch (error: any) {
    console.error('Error fetching user points:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

export default router;
