
import { formatUnits } from 'viem';

const MINIMUM_VISIBLE_BALANCE = 0.01;

export const formatBalance = (balance: bigint, decimals: number): string => {
    const formatted = formatUnits(balance, decimals);
    const value = parseFloat(formatted);

    if (value === 0) {
        return "0";
    }

    // Remove trailing zeros and unnecessary decimal point
    return value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 });
};

const USD_FORMATTER = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
});

export function formatUSD(value: number) {
    return USD_FORMATTER.format(value);
}
