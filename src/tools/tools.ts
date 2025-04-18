import { WalletClient } from 'viem';
import { getBalanceTool } from './token/getBalance';
import { getTokenBalanceTool } from './token/getTokenBalance';

/**
 * Represents a tool that can be used by the MonAI Agent.
 * 
 * @template T - The type of arguments the tool accepts
 * @template W - The type of wallet client the tool uses
 */
export interface Tool<T = any, W = WalletClient> {
  /**
   * The OpenAI function definition for this tool
   */
  definition: {
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: {
        type: 'object';
        properties: Record<string, unknown>;
        required: string[];
      };
    };
  };
  
  /**
   * The handler function that executes the tool
   * 
   * @param args - The arguments passed to the tool
   * @param walletClient - The wallet client to use for blockchain interactions
   * @param toolEnvConfigs - Environment-specific configurations for the tool
   * @returns A promise that resolves to the tool's result
   */
  handler: (
    args: T,
    walletClient?: W,
    toolEnvConfigs?: Record<string, unknown>,
  ) => Promise<any>;
}

/**
 * Registry of all available tools
 */
const toolRegistry: Record<string, Tool<any, WalletClient>> = {
  // Token tools
  get_balance: getBalanceTool,
  get_token_balance: getTokenBalanceTool,
  
  // Add more tool categories here as needed
  // Example:
  // swap: swapTool,
  // stake: stakeTool,
};

/**
 * Initializes and returns all available tools
 * 
 * @returns A record of all available tools
 */
export function initTools(): Record<string, Tool<any, WalletClient>> {
  return toolRegistry;
}

/**
 * Registers a new tool
 * 
 * @param name - The name of the tool
 * @param tool - The tool implementation
 */
export function registerTool<T = any, W = WalletClient>(
  name: string,
  tool: Tool<T, W>
): void {
  toolRegistry[name] = tool as Tool<any, WalletClient>;
}

/**
 * Gets a specific tool by name
 * 
 * @param name - The name of the tool to get
 * @returns The tool if found, undefined otherwise
 */
export function getTool<T = any, W = WalletClient>(
  name: string
): Tool<T, W> | undefined {
  return toolRegistry[name] as Tool<T, W> | undefined;
}
