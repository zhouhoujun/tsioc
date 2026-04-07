import { runTest } from '@tsdi/unit';
import { KarmaReporter } from './src';

runTest('./test/**/*.ts', { baseURL: __dirname }, KarmaReporter);