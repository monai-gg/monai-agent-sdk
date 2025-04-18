import OpenAI, { ClientOptions } from 'openai';
import { Thread } from 'openai/resources/beta/threads';
import { Assistant } from 'openai/resources/beta/assistants';
import { Run } from 'openai/resources/beta/threads/runs';
import { WalletClient } from 'viem';

import { initTools } from '../tools/tools';
import { log } from '../utils/logger';
import { createViemWalletClient } from '../utils';

export interface MonAIAgentConfig {
  walletClient: WalletClient;
  openAIConfig?: ClientOptions;
  toolEnvConfigs?: Record<string, unknown>;
  prompts?: string;
  assistantId?: string;
  threadId?: string;
}

export class MonAIAgent {
  private openAIClient: OpenAI;
  private assistant: Assistant | null = null;
  private thread: Thread | null = null;
  private threadID: string;
  private walletClient: WalletClient;
  private toolEnvConfigs: Record<string, unknown> = {};
  private isInitialized: boolean = false;
  private assistantId: string;
  private prompts: string;

  constructor(config: MonAIAgentConfig) {
    this.openAIClient = new OpenAI(config.openAIConfig);
    this.walletClient = config.walletClient || createViemWalletClient();
    this.toolEnvConfigs = config.toolEnvConfigs || {};
    this.prompts = config.prompts || '';
    this.assistantId = config.assistantId || "";
    this.threadID = config.threadId || "";
  }

  /**
   * Initialize the agent by creating or retrieving an assistant and thread
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.info('Agent already initialized');
      return;
    }

    // Create or retrieve assistant
    if (!this.assistant) {
        try {
          this.assistant = await this.retrieveAssistant();
        } catch (error) {
          this.assistant = await this.createAssistant();
          this.assistantId = this.assistant.id;
        }
    } else {
        this.assistant = await this.createAssistant();
        this.assistantId = this.assistant.id;
    }

    // Create or retrieve thread
    if (!this.threadID) {
      this.thread = await this.createThread();
    } else {
      this.thread = await this.retrieveThread(this.threadID);
    }

    this.isInitialized = true;
  }

  /**
   * Send a message and get a response from the assistant
   */
  async sendMessage(message: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.assistant || !this.thread) {
      throw new Error('MonAIAgent not initialized properly');
    }

    log.info(
      `Sending message: ${message} for wallet ${this.walletClient.account?.address}`,
    );
    await this.openAIClient.beta.threads.messages.create(this.thread.id, {
      role: 'user',
      content: message,
    });

    const run = await this.createRun();
    const result = await this.performRun(run, this.thread);
    
    if (result?.type === 'text') {
      return result.text.value;
    }
    log.info(`${result}`);
    throw new Error('Unexpected response format');
  }

  /**
   * Create an OpenAI assistant with predefined tools and instructions
   */
  private async createAssistant(): Promise<Assistant> {
    const tools = initTools();

    return await this.openAIClient.beta.assistants.create({
      model: 'gpt-4',
      temperature: 0.3,
      name: 'MonAI Assistant',
      instructions: this.prompts,
      tools: Object.values(tools).map(tool => tool.definition),
    });
  }

  /**
   * Retrieve an existing assistant by ID
   */
  private async retrieveAssistant(): Promise<Assistant> {
    return await this.openAIClient.beta.assistants.retrieve(this.assistantId);
  }

  /**
   * Create a new thread for conversation
   */
  private async createThread(message?: string): Promise<Thread> {
    const thread = await this.openAIClient.beta.threads.create();
    if (message) {
      await this.openAIClient.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: message,
      });
    }
    return thread;
  }

  /**
   * Retrieve an existing thread by ID
   */
  private async retrieveThread(threadID: string): Promise<Thread> {
    return await this.openAIClient.beta.threads.retrieve(threadID);
  }

  /**
   * Create and monitor a run for a thread
   */
  private async createRun(): Promise<Run> {
    log.info(`Running for thread ${this.threadID} with assistant ${this.assistantId}`);

    let run = await this.openAIClient.beta.threads.runs.create(this.threadID, {
      assistant_id: this.assistantId,
    });

    // Wait for the run to complete and keep polling
    while (run.status === 'in_progress' || run.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      run = await this.openAIClient.beta.threads.runs.retrieve(this.threadID, run.id);
    }

    return run;
  }

  /**
   * Handle tool calls from the assistant
   */
  private async handleRunToolCalls(run: Run, thread: Thread): Promise<Run> {
    const toolCalls = run.required_action?.submit_tool_outputs?.tool_calls;
    if (!toolCalls || toolCalls.length === 0) return run;

    const tools = initTools();
    const toolOutputs: OpenAI.Beta.Threads.Runs.RunSubmitToolOutputsParams.ToolOutput[] = [];
    
    const results = await Promise.allSettled(
      toolCalls.map(async tool => {
        const toolConfig = tools[tool.function.name];
        if (!toolConfig) {
          log.error(`Tool ${tool.function.name} not found`);
          return null;
        }

        try {
          const args = JSON.parse(tool.function.arguments);
          const output = await toolConfig.handler(args, this.walletClient, this.toolEnvConfigs);
          return {
            tool_call_id: tool.id,
            output: String(output),
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            tool_call_id: tool.id,
            output: `Error: ${errorMessage}`,
          };
        }
      }),
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        toolOutputs.push(result.value);
      } else if (result.status === 'rejected') {
        log.error(`Tool call failed: ${result.reason}`);
      }
    }

    if (toolOutputs.length === 0) {
      log.info(`No valid tool outputs to submit for run ${run.id}`);
      return run;
    }

    return this.openAIClient.beta.threads.runs.submitToolOutputsAndPoll(thread.id, run.id, {
      tool_outputs: toolOutputs,
    });
  }

  /**
   * Handle the run execution and tool calls
   */
  private async performRun(
    run: Run,
    thread: Thread,
  ): Promise<{ type: string; text: { value: string } } | null> {
    let currentRun = run;

    while (
      currentRun.status === 'requires_action' &&
      currentRun.required_action?.type === 'submit_tool_outputs'
    ) {
      currentRun = await this.handleRunToolCalls(currentRun, thread);
    }

    log.info(`${JSON.stringify(currentRun, null, 2)}`);
    if (currentRun.status === 'completed') {
      const messages = await this.openAIClient.beta.threads.messages.list(thread.id);
      const lastMessage = messages.data[0];
      if (
        lastMessage.role === 'assistant' &&
        lastMessage.content[0].type === 'text'
      ) {
        return lastMessage.content[0];
      }
    }

    return null;
  }

  // Public getters
  getAssistant(): Assistant | null {
    return this.assistant;
  }

  getThread(): Thread | null {
    return this.thread;
  }

  getWalletClient(): WalletClient {
    return this.walletClient;
  }

  getAssistantId(): string | null {
    return this.assistantId;
  }

  isAgentInitialized(): boolean {
    return this.isInitialized;
  }
} 