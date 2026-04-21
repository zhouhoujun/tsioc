"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestConfig = createTestConfig;
exports.getReporters = getReporters;
function createTestConfig(baseURL) {
    const args = process.argv.slice(2);
    const coverage = args.includes('--coverage') || args.includes('-c');
    return {
        baseURL,
        coverage: coverage ? {
            enabled: true,
            reporters: ['text', 'text-summary'],
            include: ['src/**/*.ts'],
            exclude: ['test/**/*.ts']
        } : undefined,
        hasCoverage: coverage
    };
}
function getReporters(defaultReporter, coverageReporter, hasCoverage) {
    return hasCoverage ? [defaultReporter, coverageReporter] : [defaultReporter];
}
//# sourceMappingURL=helpers.js.map