#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ToolSchema, } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { startVitest } from "vitest/node";
import path from "path";
import { extractTestCases } from "./extractTestCases.js";
import { formatTestResults } from "./formatTestResults.js";
import { runTypeCheck, formatTypeErrors } from "./typeCheck.js";
// Command line argument parsing
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: mcp-server-vitest <project-directory>");
    process.exit(1);
}
// Get project directory from arguments
const projectDir = path.resolve(args[0]);
// Schema definitions
const RunTestsArgsSchema = z.object({
    testFiles: z
        .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
        .optional()
        .transform((files) => {
        if (!files)
            return undefined;
        return Array.isArray(files) ? files : [files];
    })
        .describe("Optional test file or array of test files to run"),
});
const TypeCheckArgsSchema = z.object({
    files: z
        .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
        .optional()
        .transform((files) => {
        if (!files)
            return undefined;
        return Array.isArray(files) ? files : [files];
    })
        .describe("Optional file or array of files to type check"),
});
const ToolInputSchema = ToolSchema.shape.inputSchema;
// Server setup
const server = new Server({
    name: "vitest-server",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "run_tests",
                description: "Run Vitest tests for the project. Can run specific test files or all tests.",
                inputSchema: zodToJsonSchema(RunTestsArgsSchema),
            },
            {
                name: "type_check",
                description: "Run TypeScript type checking on the project. Returns any type errors found.",
                inputSchema: zodToJsonSchema(TypeCheckArgsSchema),
            },
        ],
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const { name, arguments: args } = request.params;
        switch (name) {
            case "run_tests": {
                const parsed = RunTestsArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid arguments for run_tests: ${parsed.error}`);
                }
                const options = {
                    root: projectDir,
                    watch: false,
                    reporters: [], // Disable default reporters to prevent console output
                    silent: true, // Suppress most of Vitest's output
                };
                if (parsed.data.testFiles) {
                    options.include = parsed.data.testFiles;
                }
                // Configure Vitest to minimize console output
                const vitest = await startVitest("test", [], options);
                if (!vitest) {
                    throw new Error("Failed to start Vitest");
                }
                await vitest.start();
                // Wait a bit for tests to complete
                await new Promise((resolve) => setTimeout(resolve, 100));
                const files = vitest.state.getFiles();
                let allTestResults = [];
                for (const fileTask of files) {
                    const testFile = vitest.state.getReportedEntity(fileTask);
                    const fileResults = extractTestCases(testFile);
                    allTestResults.push(...fileResults);
                }
                const formattedOutput = formatTestResults(allTestResults);
                await vitest.close();
                return {
                    content: [
                        {
                            type: "text",
                            text: formattedOutput,
                        },
                    ],
                };
            }
            case "type_check": {
                const parsed = TypeCheckArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid arguments for type_check: ${parsed.error}`);
                }
                try {
                    const errors = runTypeCheck(projectDir);
                    const formattedOutput = formatTypeErrors(errors);
                    return {
                        content: [
                            {
                                type: "text",
                                text: formattedOutput,
                            },
                        ],
                    };
                }
                catch (error) {
                    throw new Error(`Type checking failed: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: "text", text: `Error: ${errorMessage}` }],
            isError: true,
        };
    }
});
// Start server
async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
