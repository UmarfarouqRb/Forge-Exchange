import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '../../middleware/authenticate'; // Assuming you have an authentication middleware

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }
    const userId = req.user.sub;

    const { data, error } = await supabase
      .from('points')
      .select('total_points, level')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: row not found
      throw error;
    }

    if (!data) {
        // If no record exists, create one
        const { data: newUserPoint, error: newUserPointError } = await supabase
            .from('points')
            .insert({ user_id: userId, total_points: 0, level: 1 })
            .select()
            .single();

        if (newUserPointError) throw newUserPointError;

        return res.status(200).json({
            total_points: newUserPoint.total_points,
            level: newUserPoint.level,
        });
    }

    res.status(200).json({
        total_points: data.total_points,
        level: data.level,
    });
  } catch (error) {
    console.error('Error fetching points:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /points/deposit:
 *   post:
 *     summary: Award daily deposit bonus
 *     description: Awards 100 points to the user for their first deposit of the day.
 *     tags: [Points]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily deposit bonus awarded successfully.
 *       204:
 *         description: User has already received the daily deposit bonus.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
router.post('/deposit', authenticate, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized.' });
        }
        const userId = req.user.sub;
        const today = new Date().toISOString().split('T')[0];

        // Check if the user has already received a bonus today
        const { data: dailyDeposit, error: dailyDepositError } = await supabase
            .from('daily_deposits')
            .select('last_deposit_date')
            .eq('user_id', userId)
            .single();

        if (dailyDepositError && dailyDepositError.code !== 'PGRST116') {
            throw dailyDepositError;
        }

        if (dailyDeposit && dailyDeposit.last_deposit_date === today) {
            return res.status(204).send(); // No content, bonus already awarded
        }
        
        // Upsert points and add 100
        const { data: pointData, error: pointsError } = await supabase
            .from('points')
            .select('total_points')
            .eq('user_id', userId)
            .single();
        
        if (pointsError && pointsError.code !== 'PGRST116') {
            throw pointsError;
        }
        
        if (!pointData) {
            // Create a new record if it doesn't exist
            const { error: newPointError } = await supabase
                .from('points')
                .insert({ user_id: userId, total_points: 100, level: 1 });
            
            if (newPointError) throw newPointError;
        } else {
            // Update existing record
            const newTotalPoints = pointData.total_points + 100;
            const { error: updateError } = await supabase
                .from('points')
                .update({ total_points: newTotalPoints })
                .eq('user_id', userId);

            if (updateError) throw updateError;
        }

        // Record the deposit
        const { error: upsertError } = await supabase
            .from('daily_deposits')
            .upsert({ user_id: userId, last_deposit_date: today }, { onConflict: 'user_id' });

        if (upsertError) {
            throw upsertError;
        }

        res.status(200).json({ message: 'Daily deposit bonus awarded successfully.' });

    } catch (error) {
        console.error('Error awarding deposit bonus:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
