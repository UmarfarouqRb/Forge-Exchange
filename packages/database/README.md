# Supabase Database Setup

To set up the Supabase database, follow these steps:

1. Create a new project on [Supabase](https://supabase.io/).
2. Go to the SQL Editor in your Supabase project.
3. Run the SQL commands in `functions.sql` to create the necessary tables.
4. Create a `.env` file in the `packages/database` directory and add the following variables:

    ```
    SUPABASE_URL=YOUR_SUPABASE_URL
    SUPABASE_KEY=YOUR_SUPABASE_KEY
    ```

5. Run the following command to initialize the database:

    ```
    pnpm db:init
    ```
