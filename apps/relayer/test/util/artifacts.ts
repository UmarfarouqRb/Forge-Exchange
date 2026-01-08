import { IntentSpotRouter as IntentSpotRouterInfo, VaultSpot as VaultSpotInfo, FeeController as FeeControllerInfo } from './contracts';

export const artifacts = {
  IntentSpotRouter: {
    abi: IntentSpotRouterInfo.abi,
    bytecode: ''
  },
  addresses: {
    VaultSpot: VaultSpotInfo.address,
    FeeController: FeeControllerInfo.address,
  }
};
