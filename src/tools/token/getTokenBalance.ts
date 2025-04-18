import { Address, WalletClient } from 'viem';
import { Tool } from '../tools';
import { createViemPublicClient } from '../../utils';
import { TOKEN } from '../../constants/index';
import { ERC20 } from '../../constants/abis/erc20';
import { fetchTokenDecimalsAndFormatAmount } from '../../utils/helpers';
import { log } from '../../utils/logger';

/**
 * Arguments for the get_token_balance tool
 */
interface GetTokenBalanceArgs {
  /**
   * The wallet address to get the balance of
   * If not provided, the current wallet provider's address will be used
   */
  wallet?: Address;
  
  /**
   * The name of the token to get the balance for
   * Must match one of the token names in the TOKEN constant
   */
  tokenName: string;
}

/**
 * Tool for getting the balance of an ERC20 token for a wallet
 * 
 * This tool retrieves the balance of a specified ERC20 token
 * for a given wallet address or the current wallet provider.
 */
export const getTokenBalanceTool: Tool<GetTokenBalanceArgs> = {
  definition: {
    type: 'function',
    function: {
      name: 'get_token_balance',
      description: 'Get the balance of an ERC20 token for a wallet',
      parameters: {
        type: 'object',
        properties: {
          wallet: {
            type: 'string',
            pattern: '^0x[a-fA-F0-9]{40}$',
            description:
              'The wallet address to get the balance of. If wallet is not provided, it will use the current wallet provider',
          },
          tokenName: {
            type: 'string',
            description: 'The name of the token to get the balance for (e.g., "WMON", "MONAI")',
            enum: Object.keys(TOKEN),
          },
        },
        required: ['tokenName'],
      },
    },
  },
  handler: async (args: GetTokenBalanceArgs, walletClient?: WalletClient) => {
    try {
      const { wallet, tokenName } = args;
      const address = wallet || walletClient?.account?.address;

      if (!address) {
        throw new Error('No wallet address provided and no wallet client account available');
      }

      if (!tokenName) {
        throw new Error('Token name is required');
      }

      log.info(`Getting ${tokenName} balance for ${address}`);

      const publicClient = createViemPublicClient();

      // Find the token address from the token name (case-insensitive)
      const foundTokenName = Object.keys(TOKEN).find(
        key => key.toLowerCase() === tokenName.toLowerCase(),
      );

      if (!foundTokenName) {
        throw new Error(`Token "${tokenName}" not found. Available tokens: ${Object.keys(TOKEN).join(', ')}`);
      }

      const tokenAddress = TOKEN[foundTokenName];

      if (!tokenAddress) {
        throw new Error(`Token "${foundTokenName}" address not found`);
      }

      log.debug(`Using token address: ${tokenAddress}`);

      // Get the raw token balance
      const rawTokenBalance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20,
        functionName: 'balanceOf',
        args: [address],
      });

      // Format the token balance according to the token's decimals
      const formattedTokenBalance = await fetchTokenDecimalsAndFormatAmount(
        publicClient,
        tokenAddress,
        rawTokenBalance,
      );

      log.debug(`${foundTokenName} balance: ${formattedTokenBalance}`);
      return formattedTokenBalance;
    } catch (error) {
      log.error(`Failed to get token balance: ${error}`);
      throw new Error(`Failed to get token balance: ${error}`);
    }
  },
};
