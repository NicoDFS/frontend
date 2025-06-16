// ABI exports for KalySwap Launchpad
// Organized by category for better maintainability

// Import hardhat compilation artifacts and extract ABIs
import PresaleFactoryArtifact from './launchpad/PresaleFactory.json';
import PresaleArtifact from './launchpad/Presale.json';
import FairlaunchFactoryArtifact from './launchpad/FairLaunchFactory.json';
import FairlaunchArtifact from './launchpad/Fairlaunch.json';
import StandardTokenFactoryArtifact from './tokens/StandardTokenFactory.json';
import LiquidityGeneratorTokenFactoryArtifact from './tokens/LiquidityGeneratorTokenFactory.json';
import ERC20Artifact from './dex/erc20ABI.json';
import RouterArtifact from './dex/routerABI.json';
import FactoryArtifact from './dex/factoryABI.json';
import PairArtifact from './dex/pairABI.json';
import WKLCArtifact from './dex/wklcABI.json';
import StakingArtifact from './staking/stakingABI.json';

// Extract ABIs from hardhat artifacts (they have .abi property)
// If it's a plain ABI array, use it directly
function extractABI(artifact: any) {
  return artifact.abi || artifact;
}

// Modern ES6 exports
export const PresaleFactoryABI = extractABI(PresaleFactoryArtifact);
export const PresaleABI = extractABI(PresaleArtifact);
export const FairlaunchFactoryABI = extractABI(FairlaunchFactoryArtifact);
export const FairlaunchABI = extractABI(FairlaunchArtifact);
export const StandardTokenFactoryABI = extractABI(StandardTokenFactoryArtifact);
export const LiquidityGeneratorTokenFactoryABI = extractABI(LiquidityGeneratorTokenFactoryArtifact);
export const ERC20ABI = extractABI(ERC20Artifact);
export const RouterABI = extractABI(RouterArtifact);
export const FactoryABI = extractABI(FactoryArtifact);
export const PairABI = extractABI(PairArtifact);
export const WKLCABI = extractABI(WKLCArtifact);
export const StakingABI = extractABI(StakingArtifact);

// Legacy exports for backward compatibility
export const PRESALE_FACTORY_ABI = PresaleFactoryABI;
export const PRESALE_ABI = PresaleABI;
export const FAIRLAUNCH_FACTORY_ABI = FairlaunchFactoryABI;
export const FAIRLAUNCH_ABI = FairlaunchABI;
export const STANDARD_TOKEN_FACTORY_ABI = StandardTokenFactoryABI;
export const LIQUIDITY_GENERATOR_TOKEN_FACTORY_ABI = LiquidityGeneratorTokenFactoryABI;
export const ERC20_ABI = ERC20ABI;
export const ROUTER_ABI = RouterABI;
export const FACTORY_ABI = FactoryABI;
export const PAIR_ABI = PairABI;
export const WKLC_ABI = WKLCABI;
export const STAKING_ABI = StakingABI;

// Contract ABIs object for easy access
export const CONTRACT_ABIS = {
  PRESALE_FACTORY: PRESALE_FACTORY_ABI,
  PRESALE: PRESALE_ABI,
  FAIRLAUNCH_FACTORY: FAIRLAUNCH_FACTORY_ABI,
  FAIRLAUNCH: FAIRLAUNCH_ABI,
  STANDARD_TOKEN_FACTORY: STANDARD_TOKEN_FACTORY_ABI,
  LIQUIDITY_GENERATOR_TOKEN_FACTORY: LIQUIDITY_GENERATOR_TOKEN_FACTORY_ABI,
  ERC20: ERC20_ABI,
  ROUTER: ROUTER_ABI,
  FACTORY: FACTORY_ABI,
  PAIR: PAIR_ABI,
  WKLC: WKLC_ABI,
  STAKING: STAKING_ABI,
} as const;

// Helper function to get ABI by contract name
export function getContractABI(contractName: keyof typeof CONTRACT_ABIS) {
  return CONTRACT_ABIS[contractName];
}
