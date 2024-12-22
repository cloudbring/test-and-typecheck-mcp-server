import { TestCase, TestSuite, TestModule } from "vitest/node.js";

export const isTestCase = (
  entity: TestCase | TestSuite | TestModule
): entity is TestCase => {
  return (entity as TestCase).result !== undefined;
};
