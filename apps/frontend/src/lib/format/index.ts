
import { formatUnits } from 'viem';

const MINIMUM_VISIBLE_BALANCE = 0.000001;

export const formatBalance = (balance: bigint, decimals: number): string => {
    const formatted = formatUnits(balance, decimals);
    const value = parseFloat(formatted);

    if (value > 0 && value < MINIMUM_VISIBLE_BALANCE) {
        return `< ${MINIMUM_VISIBLE_BALANCE.toFixed(6)}`;
    }

    return value.toFixed(6);
};