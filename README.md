# MonAI Agent SDK

> **Note:** This is a lightweight version of the MonAI Agent SDK. A more fully-featured version will be released soon with additional capabilities and tools.

A powerful TypeScript SDK for building AI agents on the MonAI network. This SDK provides a seamless interface for creating and managing AI agents that can interact with the MonAI blockchain and perform various tasks.

## Features

- 🤖 Easy-to-use AI agent creation and management
- 💰 Built-in wallet and token management
- 🔗 Seamless blockchain interaction
- 🛠 Extensible tool system
- 📝 TypeScript support with full type definitions
- 🔒 Secure by design
- 📊 Advanced logging with Winston

## Installation

```bash
npm install monai-agent-sdk
```

## Quick Start

```typescript
import { MonAIAgent } from 'monai-agent-sdk';
import { createViemWalletClient } from 'monai-agent-sdk';

// Create a wallet client
const walletClient = createViemWalletClient();

// Initialize the agent
const agent = new MonAIAgent({
  walletClient,
  openAIConfig: {
    apiKey: process.env.OPENAI_API_KEY,
  },
});

// Start using the agent
await agent.initialize();
const response = await agent.sendMessage("What's my wallet balance?");
console.log(response);
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
PRIVATE_KEY=your_private_key
OPENAI_API_KEY=your_openai_api_key
```

### Agent Configuration

The `MonAIAgent` constructor accepts the following configuration options:

```typescript
interface MonAIAgentConfig {
  walletClient: WalletClient;
  openAIConfig?: ClientOptions;
  toolEnvConfigs?: Record<string, unknown>;
  prompts?: string;
  assistantId?: string;
  threadId?: string;
}
```

## Available Tools

### Token Tools

- `get_balance`: Get the native token balance of a wallet
- `get_token_balance`: Get the balance of any ERC20 token

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/monai/monai-agent-sdk.git
   cd monai-agent-sdk
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

### Available Scripts

- `npm run build` - Build the project
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run clean` - Clean build artifacts
- `npm run docs` - Generate documentation

## Project Structure

The SDK is organized into the following main components:

- **AI Module**: Core agent implementation
- **Tools Module**: Extensible tool system for blockchain interactions
- **Utils Module**: Helper functions and utilities
- **Constants Module**: Configuration and constants

## Code Ownership

This project uses GitHub's CODEOWNERS feature to automatically assign reviewers to pull requests. The ownership structure is defined in the [CODEOWNERS](CODEOWNERS) file.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## Security

If you discover a security vulnerability, please follow our [Security Policy](SECURITY.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📚 [Documentation](https://docs.monai.network)
- 💬 [Discord Community](https://discord.gg/monai)
- 🐦 [Twitter](https://twitter.com/monainetwork)