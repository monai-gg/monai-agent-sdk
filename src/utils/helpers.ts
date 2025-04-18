import {
  Address, createPublicClient, createWalletClient,
  erc20Abi,
  formatUnits, http,
  parseUnits, publicActions,
  WalletClient,
  zeroAddress,
} from 'viem';
import { log } from './logger';
import {monadTestnet} from "viem/chains";
import {privateKeyToAccount} from "viem/accounts";

/**
 * Creates a Viem public client for interacting with the Monad blockchain
 * 
 * @returns A configured Viem public client
 */
export function createViemPublicClient() {
  return createPublicClient({
    chain: monadTestnet,
    transport: http(),
  });
}

/**
 * Creates a Viem wallet client for signing transactions on the Monad blockchain
 * 
 * @returns A configured Viem wallet client
 * @throws Error if PRIVATE_KEY environment variable is not set
 */
export function createViemWalletClient() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY environment variable is not set.');
  }
  
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  return createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  }).extend(publicActions);
}

/**
 * Cache for token decimals to avoid repeated RPC calls
 */
const tokenDecimalsCache: Map<string, number> = new Map();

/**
 * Fetches the decimals for a given token
 * 
 * @param walletClient - The wallet client to use for blockchain interactions
 * @param token - The token address to fetch decimals for
 * @returns The number of decimals for the token (defaults to 18 for native tokens)
 */
export const fetchTokenDecimals = async (
  walletClient: any,
  token: Address,
): Promise<number> => {
  // Native tokens (like ETH) have 18 decimals
  if (!token || token === zeroAddress) {
    return 18;
  }

  // Check cache first
  if (!tokenDecimalsCache.has(token)) {
    try {
      const tokenDecimals = await walletClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'decimals',
        args: [],
      });
      tokenDecimalsCache.set(token, Number(tokenDecimals));
    } catch (error) {
      log.error(`[ERROR] Failed to fetch decimals for token ${token}: ${error}`);
      // Default to 18 decimals if there's an error
      tokenDecimalsCache.set(token, 18);
    }
  }

  return tokenDecimalsCache.get(token)!;
};

/**
 * Fetches token decimals and formats an amount according to the token's decimals
 * 
 * @param walletClient - The wallet client to use for blockchain interactions
 * @param token - The token address
 * @param amount - The amount to format (in wei/smallest unit)
 * @returns The formatted amount as a string
 */
export const fetchTokenDecimalsAndFormatAmount = async (
  walletClient: any,
  token: Address,
  amount: bigint,
): Promise<string> => {
  const tokenDecimals = await fetchTokenDecimals(walletClient, token);
  return formatUnits(amount, tokenDecimals);
};

/**
 * Fetches token decimals and parses a human-readable amount to the token's smallest unit
 * 
 * @param walletClient - The wallet client to use for blockchain interactions
 * @param token - The token address
 * @param amount - The human-readable amount to parse
 * @returns The parsed amount in the token's smallest unit
 */
export const fetchTokenDecimalsAndParseAmount = async (
  walletClient: any,
  token: Address,
  amount: number | bigint,
): Promise<bigint> => {
  const tokenDecimals = await fetchTokenDecimals(walletClient, token);
  return parseUnits(amount.toString(), tokenDecimals);
};

/**
 * Checks if a token has sufficient allowance for a spender and approves if needed
 * 
 * @param walletClient - The wallet client to use for blockchain interactions
 * @param token - The token address
 * @param spender - The address that will spend the tokens
 * @param amount - The amount to approve
 * @returns A promise that resolves when the allowance is sufficient
 * @throws Error if the approval transaction fails
 */
export const checkAndApproveAllowance = async (
  walletClient: WalletClient,
  token: Address,
  spender: Address,
  amount: bigint,
): Promise<void> => {
  // Skip for native tokens
  if (!token || token === zeroAddress) {
    return;
  }

  const publicClient = createViemPublicClient();
  const ownerAddress = walletClient.account?.address;
  
  if (!ownerAddress) {
    throw new Error('Wallet client does not have an account');
  }

  log.info(`[INFO] Checking allowance for ${token} to spender ${spender}`);

  // Fetch current allowance
  const allowance = await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [ownerAddress, spender],
  });

  if (BigInt(allowance) < amount) {
    log.info(
      `[INFO] Allowance insufficient. Approving ${amount} for spender ${spender}`,
    );

    // Approve the required amount
    // @ts-ignore - Viem types are not fully compatible with our usage
    const approvalTx = await walletClient.writeContract({
      address: token,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, amount]
    });

    const approvalReceipt = await publicClient.waitForTransactionReceipt({
      hash: approvalTx as `0x${string}`,
    });

    if (approvalReceipt.status !== 'success') {
      throw new Error('Approval transaction failed');
    }

    log.info(`[INFO] Approval successful`);
  } else {
    log.info(`[INFO] Sufficient allowance available`);
  }
};
