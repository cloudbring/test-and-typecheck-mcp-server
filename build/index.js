#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ToolSchema, } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { startVitest } from "vitest/node";
import path from "path";
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
        .array(z.string())
        .optional()
        .describe("Optional array of specific test files to run"),
    updateMode: z
        .enum(["run", "watch"])
        .default("run")
        .describe("Whether to run once or watch for changes"),
});
const WatchTestsArgsSchema = z.object({
    testFiles: z
        .array(z.string())
        .optional()
        .describe("Optional array of specific test files to watch"),
});
const ToolInputSchema = ToolSchema.shape.inputSchema;
function formatTestResults(results) {
    const testResults = results.state.getTestResults();
    const output = [];
    // Summary counts
    const passed = testResults.filter((t) => t.status === "pass").length;
    const failed = testResults.filter((t) => t.status === "fail").length;
    const skipped = testResults.filter((t) => t.status === "skip").length;
    output.push("Test Run Summary:");
    output.push(`Total Files: ${results.getTestFiles().length}`);
    output.push(`✓ Passed: ${passed}`);
    output.push(`✗ Failed: ${failed}`);
    output.push(`- Skipped: ${skipped}`);
    // Detailed failures
    if (failed > 0) {
        output.push("\nFailures:");
        testResults
            .filter((t) => t.status === "fail")
            .forEach((test) => {
            output.push(`\n${test.name}`);
            if (test.error?.message) {
                output.push(`Error: ${test.error.message}`);
            }
            if (test.error?.stack) {
                output.push("Stack trace:");
                output.push(test.error.stack);
            }
        });
    }
    return output.join("\n");
}
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
                name: "watch_tests",
                description: "Watch test files and run them automatically on changes.",
                inputSchema: zodToJsonSchema(WatchTestsArgsSchema),
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
                const vitest = await startVitest("test", [], {
                    root: projectDir,
                    watch: parsed.data.updateMode === "watch",
                    include: parsed.data.testFiles || undefined, // Pass undefined if no files specified
                });
                if (!vitest) {
                    throw new Error("Failed to start Vitest");
                }
                const result = await vitest.start();
                const formattedResults = formatTestResults(result);
                await vitest.close();
                return {
                    content: [
                        {
                            type: "text",
                            text: formattedResults,
                        },
                    ],
                };
            }
            case "watch_tests": {
                const parsed = WatchTestsArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid arguments for watch_tests: ${parsed.error}`);
                }
                const vitest = await startVitest("test", [], {
                    root: projectDir,
                    watch: true,
                    include: parsed.data.testFiles || undefined, // Pass undefined if no files specified
                });
                if (!vitest) {
                    throw new Error("Failed to start Vitest");
                }
                // Start watching but don't wait for completion
                void vitest.start();
                return {
                    content: [
                        {
                            type: "text",
                            text: "Test watch mode started. Tests will run automatically on file changes.",
                        },
                    ],
                };
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
    console.error("Vitest MCP Server running on stdio");
    console.error("Project directory:", projectDir);
}
runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
