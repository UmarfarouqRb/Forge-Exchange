const NATIVE_ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export function normalizeTokenForVault(
  tokenAddress: string | undefined,
  wethAddress: string | undefined
): string | undefined {
  if (!tokenAddress || !wethAddress) {
    return tokenAddress;
  }

  const lowerTokenAddress = tokenAddress.toLowerCase();
  if (
    lowerTokenAddress === NATIVE_ETH_ADDRESS.toLowerCase() ||
    lowerTokenAddress === wethAddress.toLowerCase()
  ) {
    return wethAddress;
  }

  return tokenAddress;
}
