export function formatTestResults(r) {
    const output = [];
    const results = r.filter((t) => t.result !== undefined);
    // Summary counts
    const passed = results.filter((r) => r.result.state === "passed").length;
    const failed = results.filter((r) => r.result.state === "failed").length;
    const skipped = results.filter((r) => r.result.state === "skipped").length;
    const total = results.length;
    // Group tests by file
    const testsByFile = new Map();
    results.forEach((test) => {
        const [filePath] = test.path;
        if (!testsByFile.has(filePath)) {
            testsByFile.set(filePath, []);
        }
        testsByFile.get(filePath).push(test);
    });
    // Overall summary
    output.push("Test Run Summary");
    output.push("================");
    output.push(`Total Tests: ${total}`);
    output.push(`✓ Passed: ${passed}`);
    if (failed > 0)
        output.push(`✗ Failed: ${failed}`);
    if (skipped > 0)
        output.push(`- Skipped: ${skipped}`);
    output.push("");
    // File by file summary
    for (const [filePath, tests] of testsByFile) {
        const fileFailures = tests.filter((t) => t.result.state === "failed");
        if (fileFailures.length > 0) {
            output.push(`File: ${filePath}`);
            output.push("‾".repeat(Math.min(filePath.length, 80)));
            // Show failures for this file
            fileFailures.forEach((test) => {
                // Get the test path without the file name
                const testPath = test.path.slice(1).join(" > ");
                output.push(`\n✗ ${testPath}`);
                test.result.errors?.forEach((error) => {
                    if (error.message) {
                        output.push(`  Error: ${error.message}`);
                    }
                    if (error.diff) {
                        output.push("  Diff:");
                        output.push(error.diff
                            .split("\n")
                            .map((line) => `    ${line}`)
                            .join("\n"));
                    }
                });
            });
            output.push("");
        }
    }
    return output.join("\n");
}
