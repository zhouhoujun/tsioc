import { runTest } from '@tsdi/unit';
import { CoverageReporter } from './src';

const args = process.argv.slice(2);
const withCoverage = args.includes('-c') || args.includes('--coverage');

if (withCoverage) {
    const outputDir = process.env.NODE_V8_COVERAGE || '.nyc_output';
    runTest('./test/**/*.ts', {
        baseURL: __dirname,
        platform: 'browser',
        coverage: {
            enabled: true,
            reporters: ['text', 'text-summary', 'lcov', 'cobertura'],
            include: ['**/src/**/*.ts'],
            exclude: ['**/test/**', '**/*.spec.ts'],
            outputDir: outputDir
        }
    }, CoverageReporter);
} else {
    runTest('./test/**/*.ts', { baseURL: __dirname, platform: 'browser' }, CoverageReporter);
}
