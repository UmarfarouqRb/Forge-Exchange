
export interface SwapEvent {
    from: string;
    to: string;
    amountIn: string;
    amountOut: string;
}

export interface PositionUpdateEvent {
    user: string;
    collateral: string;
    size: string;
    price: string;
}
