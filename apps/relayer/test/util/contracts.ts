export const WETH = {
  abi: ['function approve(address, uint256) returns (bool)', 'function transfer(address, uint256) returns (bool)'],
  address: '0x4e5313b9ec1047f1c41eb6846c5b3c7ab13d0d31'
};

export const VaultSpot = {
  abi: ['function setRouter(address) returns (void)', 'function transferOwnership(address) returns (void)'],
  address: '0x5b5af2b5f71ebd1e738ebb2f05f15cba38b4cd80'
};

export const FeeController = {
  abi: ['function transferOwnership(address) returns (void)'],
  address: '0x019575382779a1f4012f27f6c3f932310b404105'
};

export const IntentSpotRouter = {
  abi: [{"type":"constructor","inputs":[{"name":"_vault","type":"address","internalType":"address"},{"name":"_feeController","type":"address","internalType":"address"},{"name":"_name","type":"string","internalType":"string"},{"name":"_version","type":"string","internalType":"string"}],"stateMutability":"nonpayable"},{"type":"function","name":"CANCEL_TYPEHASH","inputs":[],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},{"type":"function","name":"SWAP_INTENT_TYPEHASH","inputs":[],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},{"type":"function","name":"adapterAddressToId","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},{"type":"function","name":"adapters","inputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"","type":"address","internalType":"contract IAdapter"}],"stateMutability":"view"},{"type":"function","name":"addAdapter","inputs":[{"name":"id","type":"bytes32","internalType":"bytes32"},{"name":"adapter","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"eip712Domain","inputs":[],"outputs":[{"name":"fields","type":"bytes1","internalType":"bytes1"},{"name":"name","type":"string","internalType":"string"},{"name":"version","type":"string","internalType":"string"},{"name":"chainId","type":"uint256","internalType":"uint256"},{"name":"verifyingContract","type":"address","internalType":"address"},{"name":"salt","type":"bytes32","internalType":"bytes32"},{"name":"extensions","type":"uint256[]","internalType":"uint256[]"}],"stateMutability":"view"},{"type":"function","name":"executeSwap","inputs":[{"name":"intent","type":"tuple","internalType":"struct ISpotRouter.SwapIntent","components":[{"name":"user","type":"address","internalType":"address"},{"name":"tokenIn","type":"address","internalType":"address"},{"name":"tokenOut","type":"address","internalType":"address"},{"name":"amountIn","type":"uint256","internalType":"uint256"},{"name":"minAmountOut","type":"uint256","internalType":"uint256"},{"name":"deadline","type":"uint256","internalType":"uint256"},{"name":"nonce","type":"uint256","internalType":"uint256"},{"name":"adapter","type":"address","internalType":"address"}]},{"name":"signature","type":"bytes","internalType":"bytes"}],"outputs":[{"name":"amountOut","type":"uint256","internalType":"uint256"}],"stateMutability":"nonpayable"},{"type":"function","name":"feeController","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract IFeeController"}],"stateMutability":"view"},{"type":"function","name":"nonces","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"owner","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"removeAdapter","inputs":[{"name":"id","type":"bytes32","internalType":"bytes32"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"renounceOwnership","inputs":[],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"swap","inputs":[{"name":"tokenIn","type":"address","internalType":"address"},{"name":"tokenOut","type":"address","internalType":"address"},{"name":"amountIn","type":"uint256","internalType":"uint256"},{"name":"adapterIds","type":"bytes32[]","internalType":"bytes32[]"},{"name":"data","type":"bytes","internalType":"bytes"}],"outputs":[{"name":"amountOut","type":"uint256","internalType":"uint256"}],"stateMutability":"nonpayable"},{"type":"function","name":"transferOwnership","inputs":[{"name":"newOwner","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"vault","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract VaultSpot"}],"stateMutability":"view"},{"type":"function","name":"whitelistedAdapters","inputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"}],
  address: '0x4194def5bf4af3ebec559ff705395ff4b7066267'
};

export const PancakeV3Adapter = {
  abi: [],
  address: '0xec3584baa96ae3e33b2bcb45bc5522ce73f045e6'
};

export const UniswapV2Adapter = {
  abi: [],
  address: '0x9174bdd2b7df25462608c294255db1eee82514a5'
};

export const AerodromeAdapter = {
  abi: [],
  address: '0x428ff0a5d54c8bd70b591a37a5c8b8ea7b136591'
};
