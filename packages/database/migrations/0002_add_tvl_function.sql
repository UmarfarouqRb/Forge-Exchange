create or replace function calculate_tvl() returns numeric as $$
declare
    total_value_locked numeric;
begin
    -- Calculate the total value of all tokens in the vault
    select sum(balance * price_usd) into total_value_locked
    from (
        -- Get the balance of each token in the vault
        select
            token_address,
            sum(case when type = 'deposit' then amount else -amount end) as balance
        from vault_movements
        group by token_address
    ) as balances
    join token_prices on balances.token_address = token_prices.token_address;

    return total_value_locked;
end;
$$ language plpgsql;