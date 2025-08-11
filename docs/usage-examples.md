# Usage Examples

This document provides practical examples of using the Test & Typecheck MCP Server in various scenarios.

## Basic Usage

### Running All Tests

```bash
# Start the server
mcp-server-vitest /path/to/your/project

# From MCP client, call run_tests with no parameters
{
  "method": "tools/call",
  "params": {
    "name": "run_tests",
    "arguments": {}
  }
}
```

### Running Specific Test Files

```bash
# Single test file
{
  "method": "tools/call",
  "params": {
    "name": "run_tests",
    "arguments": {
      "testFiles": "src/components/Button.test.ts"
    }
  }
}

# Multiple test files
{
  "method": "tools/call",
  "params": {
    "name": "run_tests",
    "arguments": {
      "testFiles": [
        "src/components/Button.test.ts",
        "src/utils/helpers.test.ts"
      ]
    }
  }
}

# Using glob patterns
{
  "method": "tools/call",
  "params": {
    "name": "run_tests",
    "arguments": {
      "testFiles": "src/**/*.test.ts"
    }
  }
}
```

### Type Checking

```bash
# Check entire project
{
  "method": "tools/call",
  "params": {
    "name": "type_check",
    "arguments": {}
  }
}

# Check specific files
{
  "method": "tools/call",
  "params": {
    "name": "type_check",
    "arguments": {
      "files": [
        "src/types/user.ts",
        "src/services/api.ts"
      ]
    }
  }
}
```

## Integration Scenarios

### VS Code Extension Integration

Example VS Code extension that integrates with the MCP server:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as vscode from 'vscode';

class TestAndTypecheckProvider {
  private client: Client | null = null;
  
  async activate(context: vscode.ExtensionContext) {
    const workspaceRoot = vscode.workspace.rootPath;
    if (!workspaceRoot) return;
    
    // Start MCP server
    const transport = new StdioClientTransport({
      command: 'mcp-server-vitest',
      args: [workspaceRoot]
    });
    
    this.client = new Client({
      name: "vscode-extension",
      version: "1.0.0"
    }, {
      capabilities: {}
    });
    
    await this.client.connect(transport);
  }
  
  async runTestsForCurrentFile() {
    if (!this.client) return;
    
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) return;
    
    const filePath = activeEditor.document.fileName;
    const testFilePath = filePath.replace('.ts', '.test.ts');
    
    const result = await this.client.request({
      method: "tools/call",
      params: {
        name: "run_tests",
        arguments: { testFiles: testFilePath }
      }
    });
    
    // Display results in output channel
    const output = vscode.window.createOutputChannel('Test Results');
    output.show();
    output.appendLine(result.content[0].text);
  }
  
  async typeCheckCurrentFile() {
    if (!this.client) return;
    
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) return;
    
    const filePath = activeEditor.document.fileName;
    
    const result = await this.client.request({
      method: "tools/call",
      params: {
        name: "type_check", 
        arguments: { files: filePath }
      }
    });
    
    // Parse and display type errors
    this.displayTypeErrors(result.content[0].text);
  }
}
```

### GitHub Actions Integration

```yaml
name: Test and Typecheck via MCP
on: [push, pull_request]

jobs:
  test-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install MCP Server
        run: npm install -g mcp-server-vitest
        
      - name: Run Type Check via MCP
        run: |
          echo '{"method":"tools/call","params":{"name":"type_check","arguments":{}}}' | \
          mcp-server-vitest ${{ github.workspace }}
          
      - name: Run Tests via MCP  
        run: |
          echo '{"method":"tools/call","params":{"name":"run_tests","arguments":{}}}' | \
          mcp-server-vitest ${{ github.workspace }}
```

### AI Assistant Integration

Example integration with an AI coding assistant:

```python
import json
import subprocess
from typing import Dict, Any

class MCPTestAndTypecheckClient:
    def __init__(self, project_path: str):
        self.project_path = project_path
        self.server_process = None
        
    def start_server(self):
        self.server_process = subprocess.Popen(
            ['mcp-server-vitest', self.project_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
    def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        request = {
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }
        
        # Send request
        self.server_process.stdin.write(json.dumps(request) + '\n')
        self.server_process.stdin.flush()
        
        # Read response
        response_line = self.server_process.stdout.readline()
        return json.loads(response_line)
    
    def analyze_code_changes(self, changed_files: list[str]) -> str:
        """Analyze code changes by running relevant tests and type checks"""
        
        # First, type check the changed files
        typecheck_result = self.call_tool("type_check", {"files": changed_files})
        
        # Find corresponding test files
        test_files = [f.replace('.ts', '.test.ts') for f in changed_files 
                     if f.endswith('.ts') and not f.endswith('.test.ts')]
        
        # Run relevant tests
        test_result = self.call_tool("run_tests", {"testFiles": test_files})
        
        # Combine results for analysis
        analysis = f"""
        Type Check Results:
        {typecheck_result['content'][0]['text']}
        
        Test Results:  
        {test_result['content'][0]['text']}
        """
        
        return analysis

# Usage
client = MCPTestAndTypecheckClient('/path/to/project')
client.start_server()

# Analyze specific files
analysis = client.analyze_code_changes(['src/user.ts', 'src/auth.ts'])
print(analysis)
```

## Persona-Based Workflows

### SDET/QA Engineer Workflow

```bash
#!/bin/bash
# Quality gate script for PR validation

PROJECT_PATH="/path/to/project"
CHANGED_FILES=("src/user-service/auth.ts" "src/user-service/profile.ts")

echo "Starting quality gate validation..."

# 1. Quick type check on changed files
echo "Step 1: Type checking changed files..."
TYPE_CHECK_REQUEST='{
  "method": "tools/call",
  "params": {
    "name": "type_check", 
    "arguments": {
      "files": ["'${CHANGED_FILES[0]}'", "'${CHANGED_FILES[1]}'"]
    }
  }
}'

TYPE_RESULT=$(echo "$TYPE_CHECK_REQUEST" | mcp-server-vitest "$PROJECT_PATH")
echo "$TYPE_RESULT"

# 2. Run focused tests on affected areas
echo "Step 2: Running focused tests..."
TEST_REQUEST='{
  "method": "tools/call",
  "params": {
    "name": "run_tests",
    "arguments": {
      "testFiles": ["src/user-service/*.test.ts", "src/auth/*.test.ts"] 
    }
  }
}'

TEST_RESULT=$(echo "$TEST_REQUEST" | mcp-server-vitest "$PROJECT_PATH")
echo "$TEST_RESULT"

# 3. Parse results and set exit code
if echo "$TYPE_RESULT" | grep -q '"isError":true'; then
  echo "❌ Type check failed"
  exit 1
fi

if echo "$TEST_RESULT" | grep -q '"isError":true'; then
  echo "❌ Tests failed"  
  exit 1
fi

echo "✅ Quality gate passed"
```

### Developer Workflow  

```typescript
// Developer IDE integration script
interface DevWorkflow {
  projectPath: string;
  mcpClient: MCPClient;
  
  async validateRefactor(): Promise<boolean> {
    console.log('🔍 Validating refactor...');
    
    // Step 1: Full project type check
    const typeCheckResult = await this.mcpClient.callTool('type_check', {});
    
    if (typeCheckResult.isError) {
      console.error('❌ Type errors found:');
      console.error(typeCheckResult.content[0].text);
      return false;
    }
    
    console.log('✅ No type errors found');
    
    // Step 2: Full test suite
    const testResult = await this.mcpClient.callTool('run_tests', {});
    
    if (testResult.isError) {
      console.error('❌ Test failures:');  
      console.error(testResult.content[0].text);
      return false;
    }
    
    console.log('✅ All tests passing');
    return true;
  }
  
  async quickCheck(modifiedFiles: string[]): Promise<void> {
    console.log('⚡ Running quick validation...');
    
    // Quick type check on modified files only
    const typeCheck = await this.mcpClient.callTool('type_check', {
      files: modifiedFiles
    });
    
    // Find and run related tests
    const testFiles = modifiedFiles
      .map(file => file.replace(/\.ts$/, '.test.ts'))
      .filter(testFile => fs.existsSync(testFile));
      
    if (testFiles.length > 0) {
      const testResult = await this.mcpClient.callTool('run_tests', {
        testFiles
      });
      
      console.log(testResult.content[0].text);
    }
  }
}
```

## Advanced Examples

### Batch Processing Multiple Projects

```python
import asyncio
import json
from pathlib import Path

class BatchProjectValidator:
    async def validate_projects(self, project_paths: list[str]):
        """Validate multiple projects concurrently"""
        tasks = []
        for project_path in project_paths:
            task = asyncio.create_task(self.validate_single_project(project_path))
            tasks.append(task)
            
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Summarize results
        for i, result in enumerate(results):
            print(f"Project {project_paths[i]}: {result}")
    
    async def validate_single_project(self, project_path: str) -> dict:
        # Start MCP server for this project
        server_process = await asyncio.create_subprocess_exec(
            'mcp-server-vitest', project_path,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        # Type check
        typecheck_request = {
            "method": "tools/call",
            "params": {"name": "type_check", "arguments": {}}
        }
        
        server_process.stdin.write(
            (json.dumps(typecheck_request) + '\n').encode()
        )
        await server_process.stdin.drain()
        
        response = await server_process.stdout.readline()
        typecheck_result = json.loads(response.decode())
        
        # Test run  
        test_request = {
            "method": "tools/call",
            "params": {"name": "run_tests", "arguments": {}}
        }
        
        server_process.stdin.write(
            (json.dumps(test_request) + '\n').encode()
        )
        await server_process.stdin.drain()
        
        response = await server_process.stdout.readline()
        test_result = json.loads(response.decode())
        
        # Cleanup
        server_process.terminate()
        await server_process.wait()
        
        return {
            "typecheck": typecheck_result.get('isError', False),
            "tests": test_result.get('isError', False)
        }

# Usage
validator = BatchProjectValidator()
asyncio.run(validator.validate_projects([
    '/path/to/project1',
    '/path/to/project2', 
    '/path/to/project3'
]))
```

### Custom Result Processing

```typescript
interface TestResult {
  passed: number;
  failed: number;
  duration: number;
  failures: Array<{
    test: string;
    error: string;
  }>;
}

class ResultProcessor {
  parseTestResults(mcpResponse: string): TestResult {
    // Parse the formatted text response from MCP server
    const lines = mcpResponse.split('\n');
    
    const result: TestResult = {
      passed: 0,
      failed: 0, 
      duration: 0,
      failures: []
    };
    
    // Extract summary statistics
    const summaryMatch = mcpResponse.match(/(\d+) passed.*?(\d+) failed.*?(\d+\.?\d*)ms/);
    if (summaryMatch) {
      result.passed = parseInt(summaryMatch[1]);
      result.failed = parseInt(summaryMatch[2]);
      result.duration = parseFloat(summaryMatch[3]);
    }
    
    // Extract failure details
    const failureRegex = /FAIL\s+(.*?)\n(.*?)(?=\n\n|\n$)/gs;
    let match;
    while ((match = failureRegex.exec(mcpResponse)) !== null) {
      result.failures.push({
        test: match[1].trim(),
        error: match[2].trim()
      });
    }
    
    return result;
  }
  
  generateReport(testResult: TestResult): string {
    const successRate = (testResult.passed / (testResult.passed + testResult.failed)) * 100;
    
    return `
## Test Report
- **Success Rate**: ${successRate.toFixed(1)}%
- **Tests Passed**: ${testResult.passed}
- **Tests Failed**: ${testResult.failed}  
- **Duration**: ${testResult.duration}ms

${testResult.failures.length > 0 ? '### Failures:\n' + 
  testResult.failures.map(f => `- **${f.test}**: ${f.error}`).join('\n') : ''}
    `;
  }
}
```

These examples demonstrate the flexibility and power of the Test & Typecheck MCP Server across different use cases, from simple IDE integration to complex CI/CD pipelines and batch processing scenarios.