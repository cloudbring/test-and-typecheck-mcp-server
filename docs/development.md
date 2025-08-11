# Development Guide

This guide covers development workflows, testing strategies, and contribution guidelines for the Test & Typecheck MCP Server.

## Development Setup

### Prerequisites
- Node.js >= 18.0.0
- npm or pnpm
- Git
- TypeScript knowledge

### Initial Setup

```bash
# Clone the repository  
git clone https://github.com/cloudbring/test-and-typecheck-mcp-server.git
cd test-and-typecheck-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Test the server
npm start /path/to/test-project
```

### Project Structure

```
test-and-typecheck-mcp-server/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── extractTestCases.ts   # Test result parsing logic
│   ├── formatTestResults.ts  # Test result formatting
│   ├── typeCheck.ts         # TypeScript checking logic
│   └── isTestCase.ts        # Test case identification
├── build/                   # Compiled JavaScript output
├── docs/                    # Documentation
├── package.json
├── tsconfig.json
└── README.md
```

## Development Workflow

### Building and Testing

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Start the server for testing
npm start <project-path>
```

### Code Style and Linting

The project follows TypeScript best practices:

- **Strict TypeScript configuration**: All strict mode options enabled
- **ES Modules**: Uses ES module syntax throughout
- **Explicit types**: Prefer explicit type annotations where helpful
- **Error handling**: Comprehensive error handling with proper typing

### Testing the Server

#### Manual Testing

Create a test project with vitest and TypeScript:

```bash
# Create test project
mkdir test-project
cd test-project
npm init -y
npm install vitest typescript @types/node

# Create a simple test
cat > src/math.ts << EOF
export function add(a: number, b: number): number {
  return a + b;
}
EOF

cat > src/math.test.ts << EOF  
import { describe, it, expect } from 'vitest';
import { add } from './math';

describe('math', () => {
  it('should add numbers', () => {
    expect(add(2, 3)).toBe(5);
  });
  
  it('should handle negative numbers', () => {
    expect(add(-1, 1)).toBe(0);
  });
});
EOF

# Create vitest config
cat > vitest.config.ts << EOF
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node'
  }
});
EOF

# Create tsconfig.json
cat > tsconfig.json << EOF
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext", 
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
EOF
```

Test the MCP server:

```bash
# Start the server
cd ../test-and-typecheck-mcp-server
npm run build
node build/index.js ../test-project

# In another terminal, send MCP requests
echo '{"method":"tools/list","params":{}}' | node build/index.js ../test-project

echo '{"method":"tools/call","params":{"name":"run_tests","arguments":{}}}' | \
  node build/index.js ../test-project
  
echo '{"method":"tools/call","params":{"name":"type_check","arguments":{}}}' | \
  node build/index.js ../test-project
```

#### Automated Testing

While the project doesn't currently have automated tests, here's how you could add them:

```typescript
// tests/server.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';

describe('MCP Server Integration', () => {
  let serverProcess: ChildProcess;
  const testProjectPath = join(__dirname, 'fixtures', 'test-project');
  
  beforeEach(async () => {
    serverProcess = spawn('node', ['build/index.js', testProjectPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
  
  afterEach(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });
  
  it('should list available tools', async () => {
    const request = JSON.stringify({
      method: 'tools/list',
      params: {}
    }) + '\n';
    
    serverProcess.stdin?.write(request);
    
    return new Promise((resolve) => {
      serverProcess.stdout?.once('data', (data) => {
        const response = JSON.parse(data.toString());
        expect(response.tools).toHaveLength(2);
        expect(response.tools[0].name).toBe('run_tests');
        expect(response.tools[1].name).toBe('type_check');
        resolve(undefined);
      });
    });
  });
  
  it('should run tests successfully', async () => {
    const request = JSON.stringify({
      method: 'tools/call',
      params: {
        name: 'run_tests',
        arguments: {}
      }
    }) + '\n';
    
    serverProcess.stdin?.write(request);
    
    return new Promise((resolve) => {
      serverProcess.stdout?.once('data', (data) => {
        const response = JSON.parse(data.toString());
        expect(response.content[0].type).toBe('text');
        expect(response.content[0].text).toContain('passed');
        resolve(undefined);
      });
    });
  });
});
```

## Architecture Deep Dive

### MCP Protocol Implementation

The server implements MCP using the official SDK:

```typescript
// Key components of the implementation

// 1. Server setup with capabilities
const server = new Server({
  name: "vitest-server", 
  version: "0.1.0"
}, {
  capabilities: {
    tools: {} // Declares tool capability
  }
});

// 2. Tool registration
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Tool definitions with schemas
    ]
  };
});

// 3. Tool invocation handling
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Parameter validation
  // Tool execution
  // Result formatting
});

// 4. Transport connection
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Tool Implementation Pattern

Each tool follows a consistent pattern:

```typescript
// 1. Schema definition using Zod
const ToolArgsSchema = z.object({
  param: z.string().optional()
});

// 2. Tool registration in ListToolsRequestSchema handler
{
  name: "tool_name",
  description: "Tool description",
  inputSchema: zodToJsonSchema(ToolArgsSchema)
}

// 3. Tool implementation in CallToolRequestSchema handler  
case "tool_name": {
  // Parse and validate arguments
  const parsed = ToolArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments: ${parsed.error}`);
  }
  
  // Execute tool logic
  const result = await executeTool(parsed.data);
  
  // Return formatted response
  return {
    content: [{
      type: "text", 
      text: formatResult(result)
    }]
  };
}
```

### Error Handling Strategy

The server implements comprehensive error handling:

```typescript
// 1. Schema validation errors
const parsed = Schema.safeParse(args);
if (!parsed.success) {
  throw new Error(`Invalid arguments: ${parsed.error}`);
}

// 2. Tool execution errors with context
try {
  const result = await executeTool(args);
  return formatSuccess(result);
} catch (error) {
  throw new Error(`Tool execution failed: ${error.message}`);
}

// 3. Top-level error handling
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    // Tool logic
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
});
```

## Adding New Tools

### Step-by-Step Guide

1. **Define the tool schema**:
```typescript
const NewToolArgsSchema = z.object({
  param1: z.string().describe("Description of param1"),
  param2: z.number().optional().describe("Optional numeric parameter")
});
```

2. **Add tool to the tools list**:
```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ... existing tools
      {
        name: "new_tool",
        description: "Description of what the new tool does",
        inputSchema: zodToJsonSchema(NewToolArgsSchema) as ToolInput
      }
    ]
  };
});
```

3. **Implement the tool handler**:
```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // ... existing cases
  
  case "new_tool": {
    const parsed = NewToolArgsSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid arguments for new_tool: ${parsed.error}`);
    }
    
    // Implement tool logic
    const result = await executeNewTool(parsed.data);
    
    return {
      content: [{
        type: "text",
        text: formatNewToolResult(result)
      }]
    };
  }
});
```

4. **Create the tool implementation**:
```typescript
// src/newTool.ts
export async function executeNewTool(args: NewToolArgs): Promise<NewToolResult> {
  // Implementation logic
}

export function formatNewToolResult(result: NewToolResult): string {
  // Result formatting logic
}
```

### Tool Development Best Practices

1. **Input Validation**: Always validate inputs using Zod schemas
2. **Error Handling**: Provide clear, actionable error messages
3. **Documentation**: Update API documentation when adding tools
4. **Testing**: Add test cases for new tools
5. **Performance**: Consider tool execution time and resource usage

## Contributing

### Code Review Process

1. **Fork and Branch**: Create a feature branch from `main`
2. **Development**: Implement changes following existing patterns
3. **Testing**: Ensure all existing functionality continues to work
4. **Documentation**: Update relevant documentation
5. **Pull Request**: Submit PR with clear description

### Commit Message Format

```
type(scope): description

- feat: new feature
- fix: bug fix  
- docs: documentation changes
- refactor: code refactoring
- test: adding tests
- chore: maintenance tasks
```

Examples:
- `feat(tools): add coverage reporting tool`
- `fix(typecheck): handle missing tsconfig.json gracefully`
- `docs(api): update tool parameter documentation`

### Release Process

1. **Version Bump**: Update version in package.json
2. **Changelog**: Document changes in CHANGELOG.md
3. **Build**: Ensure clean build with `npm run build`
4. **Tag**: Create git tag with version number
5. **Publish**: Publish to npm registry

## Debugging

### Common Issues

1. **Server won't start**: Check project directory exists and is accessible
2. **Tool failures**: Verify vitest/typescript are installed in target project
3. **Permission errors**: Ensure proper file system permissions
4. **JSON parsing errors**: Validate MCP request format

### Debug Logging

Add debug logging to troubleshoot issues:

```typescript
// Enable debug mode with environment variable
const DEBUG = process.env.DEBUG === 'true';

function debug(message: string, data?: any) {
  if (DEBUG) {
    console.error(`[DEBUG] ${message}`, data || '');
  }
}

// Use throughout the code
debug('Starting vitest with options:', options);
debug('Received tool call:', { name, args });
```

Usage:
```bash
DEBUG=true node build/index.js /path/to/project
```

### Performance Monitoring

Monitor tool execution performance:

```typescript
async function executeWithTiming<T>(
  name: string, 
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    debug(`${name} completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    debug(`${name} failed after ${duration}ms:`, error);
    throw error;
  }
}

// Usage
const result = await executeWithTiming('run_tests', () => 
  executeVitest(options)
);
```

This development guide provides the foundation for contributing to and extending the Test & Typecheck MCP Server. Follow these patterns and practices to maintain code quality and consistency.