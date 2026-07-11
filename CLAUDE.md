# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript MCP (Model Context Protocol) server that provides testing and type-checking capabilities via Vitest. The server exposes two main tools:
- `run_tests`: Execute Vitest tests
- `type_check`: Run TypeScript type checking

## Development Commands

### Build and Run
- `npm run build` - Compile TypeScript and make the output executable
- `npm start` - Run the compiled MCP server
- `npm run dev` - Watch mode for TypeScript compilation during development

### Usage
The server requires a project directory argument when starting:
```bash
mcp-server-vitest <project-directory>
```

## Architecture

### Core Components

**MCP Server Implementation** (`src/index.ts`)
- Sets up an MCP server using `@modelcontextprotocol/sdk`
- Exposes two tools via the MCP protocol
- Handles tool requests and returns formatted results
- Entry point is a CLI that requires a project directory argument

**Test Runner** (`src/extractTestCases.ts`, `src/formatTestResults.ts`)
- Uses Vitest's programmatic API to run tests
- Extracts test results from Vitest's internal state
- Formats test results for MCP tool responses

**Type Checker** (`src/typeCheck.ts`)
- Uses TypeScript Compiler API directly
- Reads tsconfig.json from the target project
- Collects and formats type errors with file locations

### Key Dependencies
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `vitest` - Test runner framework
- `zod` & `zod-to-json-schema` - Schema validation for tool inputs
- TypeScript compiler API for type checking

## TypeScript Configuration

The project uses ES modules (`"type": "module"` in package.json) and compiles to the `build/` directory. The compiled entry point is made executable during the build process.