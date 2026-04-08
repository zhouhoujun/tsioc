import { runTest } from '@tsdi/unit';
import { CoverageReporter } from './src';


runTest('./test/**/*.ts', { baseURL: __dirname, platform: 'browser' }, CoverageReporter);
