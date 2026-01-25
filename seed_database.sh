#!/bin/bash

# This script executes all the SQL seed files in the correct order.

psql $DATABASE_URL -f packages/database/seeds/001_chains.sql
psql $DATABASE_URL -f packages/database/seeds/002_tokens.sql
psql $DATABASE_URL -f packages/database/seeds/003_markets.sql
psql $DATABASE_URL -f packages/database/seeds/004_market_tokens.sql
psql $DATABASE_URL -f packages/database/seeds/05_fee_tiers.sql
