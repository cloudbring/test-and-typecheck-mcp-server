import ts from "typescript";
import path from "path";
export function runTypeCheck(projectPath) {
    // Look for tsconfig.json
    const configPath = ts.findConfigFile(projectPath, ts.sys.fileExists, "tsconfig.json");
    if (!configPath) {
        throw new Error("Could not find a tsconfig.json file");
    }
    // Parse the config file
    const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile);
    if (error) {
        throw new Error(`Error reading tsconfig.json: ${error.messageText}`);
    }
    // Parse the TSConfig options
    const { options, fileNames, errors } = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(configPath));
    if (errors.length > 0) {
        throw new Error(`Error parsing tsconfig.json: ${errors.map(e => e.messageText).join("\n")}`);
    }
    // Create a program
    const program = ts.createProgram(fileNames, options);
    const diagnostics = ts.getPreEmitDiagnostics(program);
    // Format the diagnostics into a more usable structure
    return diagnostics.map(diagnostic => {
        let file = "";
        let line = 0;
        let column = 0;
        if (diagnostic.file) {
            const { line: lineNum, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            file = path.relative(projectPath, diagnostic.file.fileName);
            line = lineNum + 1;
            column = character + 1;
        }
        return {
            file,
            line,
            column,
            code: diagnostic.code,
            message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
        };
    });
}
export function formatTypeErrors(errors) {
    if (errors.length === 0) {
        return "No type errors found!";
    }
    const output = [];
    output.push(`Found ${errors.length} type error${errors.length === 1 ? "" : "s"}:`);
    output.push("");
    // Group errors by file
    const errorsByFile = new Map();
    errors.forEach(error => {
        if (!errorsByFile.has(error.file)) {
            errorsByFile.set(error.file, []);
        }
        errorsByFile.get(error.file).push(error);
    });
    for (const [file, fileErrors] of errorsByFile) {
        output.push(`File: ${file}`);
        output.push("‾".repeat(Math.min(file.length, 80)));
        fileErrors.forEach(error => {
            output.push(`${error.line}:${error.column} - error TS${error.code}: ${error.message}`);
        });
        output.push("");
    }
    return output.join("\n");
}
