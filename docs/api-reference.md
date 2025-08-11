# API Reference

## MCP Protocol Implementation

This server implements the Model Context Protocol (MCP) specification, exposing tools through JSON-RPC over stdio transport.

## Server Information

- **Name**: `vitest-server`
- **Version**: `0.1.0`
- **Transport**: stdio
- **Capabilities**: `tools`

## Tools

### run_tests

Executes Vitest tests for the specified project.

#### Parameters

```typescript
interface RunTestsParams {
  testFiles?: string | string[];
}
```

- **testFiles** (optional): String or array of strings specifying test files to run
  - If not provided, runs all tests
  - Supports glob patterns and specific file paths
  - Examples:
    - `"src/components/Button.test.ts"`
    - `["src/utils/*.test.ts", "src/components/*.test.ts"]`

#### Returns

```typescript
interface RunTestsResult {
  content: [{
    type: "text";
    text: string; // Formatted test results
  }];
}
```

The formatted text includes:
- Test summary (passed/failed counts)
- Individual test case results
- Execution duration
- Error details for failed tests

#### Example Usage

```json
{
  "method": "tools/call",
  "params": {
    "name": "run_tests",
    "arguments": {
      "testFiles": ["src/components/*.test.ts"]
    }
  }
}
```

#### Error Conditions

- Invalid `testFiles` parameter type
- Vitest not found or not executable
- Project directory not accessible
- Vitest configuration errors

### type_check

Performs TypeScript type checking on the specified project.

#### Parameters

```typescript
interface TypeCheckParams {
  files?: string | string[];
}
```

- **files** (optional): String or array of strings specifying files to type check
  - If not provided, checks entire project
  - Supports glob patterns and specific file paths
  - Examples:
    - `"src/utils/helpers.ts"`
    - `["src/types/*.ts", "src/services/*.ts"]`

#### Returns

```typescript
interface TypeCheckResult {
  content: [{
    type: "text";
    text: string; // Formatted type check results
  }];
}
```

The formatted text includes:
- Type error count and summary
- Detailed error descriptions with file locations
- Warning messages
- Files analyzed count

#### Example Usage

```json
{
  "method": "tools/call",
  "params": {
    "name": "type_check",
    "arguments": {
      "files": ["src/services/api.ts"]
    }
  }
}
```

#### Error Conditions

- Invalid `files` parameter type
- TypeScript compiler not found
- Project directory not accessible
- tsconfig.json parsing errors

## Protocol Methods

### tools/list

Lists all available tools provided by this server.

#### Request

```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "params": {},
  "id": 1
}
```

#### Response

```json
{
  "tools": [
    {
      "name": "run_tests",
      "description": "Run Vitest tests for the project. Can run specific test files or all tests.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "testFiles": {
            "anyOf": [
              {"type": "string"},
              {"type": "array", "items": {"type": "string"}},
              {"type": "null"}
            ],
            "description": "Optional test file or array of test files to run"
          }
        }
      }
    },
    {
      "name": "type_check", 
      "description": "Run TypeScript type checking on the project. Returns any type errors found.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "files": {
            "anyOf": [
              {"type": "string"},
              {"type": "array", "items": {"type": "string"}},
              {"type": "null"}
            ],
            "description": "Optional file or array of files to type check"
          }
        }
      }
    }
  ]
}
```

### tools/call

Invokes a specific tool with provided arguments.

#### Request Format

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "<tool_name>",
    "arguments": {
      // Tool-specific parameters
    }
  },
  "id": 2
}
```

#### Response Format

```json
{
  "content": [
    {
      "type": "text",
      "text": "<formatted_results>"
    }
  ]
  // isError is optional; only include on error:
  // "isError": true
}
```

## Error Handling

### Schema Validation Errors

When invalid parameters are provided:

```json
{
  "content": [
    {
      "type": "text", 
      "text": "Error: Invalid arguments for <tool_name>: <validation_error>"
    }
  ],
  "isError": true
}
```

### Tool Execution Errors

When tool execution fails:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: <error_description>"
    }
  ],
  "isError": true
}
```

### Common Error Types

1. **Tool Not Found**: `Unknown tool: <tool_name>`
2. **Parameter Validation**: `Invalid arguments for <tool_name>: <details>`
3. **Execution Failure**: Tool-specific error messages
4. **File System**: Permission or access errors
5. **Configuration**: Missing or invalid project configuration

## Client Integration

### MCP SDK Integration

For clients using the official MCP SDK:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Create transport
const transport = new StdioClientTransport({
  command: "mcp-server-vitest",
  args: ["/path/to/project"]
});

// Create client
const client = new Client({
  name: "my-client",
  version: "1.0.0"
}, {
  capabilities: {}
});

// Connect
await client.connect(transport);

// List tools
const tools = await client.request({
  method: "tools/list",
  params: {}
});

// Call tool
const result = await client.request({
  method: "tools/call", 
  params: {
    name: "run_tests",
    arguments: { testFiles: ["src/*.test.ts"] }
  }
});
```

### Raw JSON-RPC Integration

For custom implementations, communicate via stdin/stdout with JSON-RPC messages following the MCP protocol specification.

## Performance Notes

- Tools execute synchronously and return results when complete
- Large test suites may take significant time to execute
- Type checking performance depends on project size and complexity
- Consider timeouts for long-running operations
- Tool instances are short-lived (created per invocation)