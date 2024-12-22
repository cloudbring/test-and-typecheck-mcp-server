export function extractTestCases(entity, parentPath = []) {
    if (!entity)
        return [];
    // Base case: Test case
    if (entity.type === "test") {
        const result = entity.result();
        return [
            {
                name: entity.name,
                path: [...parentPath, entity.name],
                result: result,
            },
        ];
    }
    // Recursive case: Suite or Module
    if (entity.type === "suite" || entity.type === "module") {
        const currentPath = [
            ...parentPath,
            entity.type === "suite" ? entity.name : entity.moduleId,
        ];
        return Array.from(entity.children ?? []).flatMap((child) => extractTestCases(child, currentPath));
    }
    return [];
}
