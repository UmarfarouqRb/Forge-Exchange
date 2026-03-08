# Stage 1: Invite-Only Beta Program - "Forge Points"

The goal is to create an exclusive, rewarding, and feedback-driven environment for our first users.


## Phase 1: Backend & Foundational Setup**

This phase focuses on building the core infrastructure for the invite and points system.

1. Invite-Only System:

Invite Code Generation:
Create a system to generate unique, single-use invite codes. These can be stored in a new database table `(invite_code, is_used, created_at)`.
*   **Sign-up Flow:** Modify the user sign-up process to require a valid, unused invite code from this table. When a code is used, it's marked as `is_used`.
*   **Referral System (Optional but recommended):** To encourage growth, allow each new beta user to receive 3-5 of their own invite codes to share after they complete their first deposit.

**2. Forge Points Engine:**
*   **Database:**
    *   Create a `user_points` table to store the total points and level for each user: `(user_id, total_points, level)`.
    *   Create a `point_events` log table: `(event_id, user_id, event_type, points_awarded, description, timestamp)`. This provides a clear audit trail for every point transaction.
*   **Point Allocation Rules (Initial Proposal):**
    *   **Sign-up:** +100 Points
    *   **First Deposit:** +200 Points
    *   **Deposit:** +50 Points (Capped at 1 per day)
    *   **First Trade:** +150 Points
    *   **Trade:** +25 Points (Capped at 10 per day)
    *   **Internal Transfer:** +25 Points (Capped at 5 per day)
    *   **Withdrawal:** +25 Points (Capped at 1 per day)
    *   **Valuable Feedback:** +100 to 500 Points (Awarded manually by the team for high-quality, actionable feedback).
*   **Milestone & Badge System:**
    *   **Level 1:** Default (0 Points)
    *   **Level 2:** 1,000 Points
    *   **Level 3:** 5,000 Points
    *   **Level 4:** 10,000 Points
    *   **Level 5:** 25,000 Points (and so on)
*   **API Endpoints:**
    *   `GET /api/v1/user/points`: A secure endpoint for the logged-in user to fetch their `total_points`, `level`, and progress to the next level.
    *   Internal logic to automatically trigger point awards when a user completes an action (e.g., hook into the `createOrder` or `deposit` success callbacks).

---

### **Phase 2: Frontend & User Experience**

This phase focuses on making the points program visible and engaging for the user.

**1. Assets Page Integration:**
*   Create a new component, `ForgePointsCard`, to be displayed prominently on the `/assets` page.
*   This card will fetch data from the `GET /api/v1/user/points` endpoint.
*   It should display:
    *   The user's current Forge Points total.
    *   Their current level and badge.
    *   A progress bar showing how close they are to the next level milestone.

**2. Navigation Badge:**
*   Create a small `LevelBadge` component that displays the user's current level badge (e.g., "Lvl 2").
*   Integrate this component into the main navigation bar, positioned at the top right, next to the user's profile or wallet connection status. It should be visually subtle but recognizable.

**3. Feedback Mechanism:**
*   Add a "Provide Feedback" button or link in a persistent location (e.g., the footer or user menu).
*   This button will open a simple modal form with:
    *   A dropdown for the feedback category (e.g., "UI/UX", "Bug Report", "Feature Request", "General").
    *   A text area for the detailed feedback.
    *   An optional file upload for screenshots.
*   Submitting this form will post the data to a new `POST /api/v1/feedback` endpoint.

---

### **Phase 3: Program Management & Operations**

This phase focuses on the human element of running the beta program.

**1. Onboarding & Communication:**
*   **Waitlist:** Set up a simple landing page for prospective testers to register their interest.
*   **Invitation:** Send out invite codes in controlled batches via email. The welcome email should clearly explain:
    *   The purpose of the beta program.
    *   The Forge Points system and how to earn points.
    *   How and where to provide feedback.
    *   A link to a dedicated beta tester communication channel.
*   **Community:** Create a private Discord channel exclusively for beta testers. This is the most effective way to foster a sense of community, gather real-time feedback, and provide support.

**2. Feedback Review & Rewards:**
*   Establish a weekly or bi-weekly routine for the development team to review all feedback submitted through the form and Discord.
*   Create a simple admin interface or script to manually award Forge Points for valuable feedback, which will create an event in the `point_events` log.
