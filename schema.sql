CREATE TABLE "markets" (
	"trading_pair_id" uuid PRIMARY KEY NOT NULL,
	"last_price" numeric,
	"volume_24h" numeric DEFAULT '0',
	"high_24h" numeric,
	"low_24h" numeric,
	"updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "order_books" (
	"trading_pair_id" uuid NOT NULL,
	"side" text NOT NULL,
	"price" numeric NOT NULL,
	"quantity" numeric NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "order_books_trading_pair_id_side_price_pk" PRIMARY KEY("trading_pair_id","side","price")
);

CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" text NOT NULL,
	"trading_pair_id" uuid,
	"side" text NOT NULL,
	"price" numeric NOT NULL,
	"quantity" numeric NOT NULL,
	"filled_quantity" numeric DEFAULT '0',
	"status" text DEFAULT 'open',
	"created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" integer NOT NULL,
	"address" text NOT NULL,
	"symbol" text NOT NULL,
	"name" text,
	"decimals" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "tokens_chain_id_address_key" UNIQUE("chain_id","address")
);

CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trading_pair_id" uuid,
	"price" numeric NOT NULL,
	"quantity" numeric NOT NULL,
	"maker_order_id" uuid,
	"taker_order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "trading_pairs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_token_id" uuid,
	"quote_token_id" uuid,
	"symbol" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "trading_pairs_symbol_key" UNIQUE("symbol")
);

ALTER TABLE "markets" ADD CONSTRAINT "markets_trading_pair_id_trading_pairs_id_fk" FOREIGN KEY ("trading_pair_id") REFERENCES "public"."trading_pairs"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "order_books" ADD CONSTRAINT "order_books_trading_pair_id_trading_pairs_id_fk" FOREIGN KEY ("trading_pair_id") REFERENCES "public"."trading_pairs"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "orders" ADD CONSTRAINT "orders_trading_pair_id_trading_pairs_id_fk" FOREIGN KEY ("trading_pair_id") REFERENCES "public"."trading_pairs"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "trades" ADD CONSTRAINT "trades_trading_pair_id_trading_pairs_id_fk" FOREIGN KEY ("trading_pair_id") REFERENCES "public"."trading_pairs"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "trading_pairs" ADD CONSTRAINT "trading_pairs_base_token_id_tokens_id_fk" FOREIGN KEY ("base_token_id") REFERENCES "public"."tokens"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "trading_pairs" ADD CONSTRAINT "trading_pairs_quote_token_id_tokens_id_fk" FOREIGN KEY ("quote_token_id") REFERENCES "public"."tokens"("id") ON DELETE no action ON UPDATE no action;
