
CREATE TABLE "trade_executions" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "tx_hash" text,
 "user_address" text,
 "token_in" text,
 "token_out" text,
 "amount_in" numeric,
 "amount_out" numeric,
 "amount_usd" numeric,
 "protocol_fee" numeric,
 "relayer_fee" numeric,
 "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "tvl_snapshots" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "tvl_usd" numeric,
 "timestamp" timestamp with time zone DEFAULT now()
);
