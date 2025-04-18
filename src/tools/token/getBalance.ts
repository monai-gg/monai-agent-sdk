import { Address, WalletClient } from 'viem';
import { Tool } from '../tools';
import { formatEther } from 'viem';
import { createViemPublicClient } from '../../utils';
import { log } from '../../utils/logger';

/**
 * Arguments for the get_balance tool
 */
interface GetBalanceArgs {
  /**
   * The wallet address to get the balance of
   * If not provided, the current wallet provider's address will be used
   */
  wallet?: Address;
}

/**
 * Tool for getting the native token balance of a wallet
 * 
 * This tool retrieves the balance of the native token (e.g., ETH, MON)
 * for a specified wallet address or the current wallet provider.
 */
export const getBalanceTool: Tool<GetBalanceArgs> = {
  definition: {
    type: 'function',
    function: {
      name: 'get_balance',
      description:
        'Get the native token balance of a wallet. If wallet is not provided, it will use the current wallet provider',
      parameters: {
        type: 'object',
        properties: {
          wallet: {
            type: 'string',
            pattern: '^0x[a-fA-F0-9]{40}$',
            description:
              'The wallet address to get the balance of. Default is current wallet provider',
          },
        },
        required: [],
      },
    },
  },
  handler: async (args, walletClient?: WalletClient) => {
    try {
      const publicClient = createViemPublicClient();
      const address = args.wallet || walletClient?.account?.address;
      
      if (!address) {
        throw new Error('No wallet address provided and no wallet client account available');
      }
      
      log.info(`Getting native token balance for ${address}`);
      
      const balance = await publicClient.getBalance({ address });
      const formattedBalance = formatEther(balance);
      
      log.debug(`Balance: ${formattedBalance}`);
      return formattedBalance;
    } catch (error) {
      log.error(`Failed to get balance: ${error}`);
      throw new Error(`Failed to get balance: ${error}`);
    }
  },
};
