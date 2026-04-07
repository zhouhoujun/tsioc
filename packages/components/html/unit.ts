import { runTest } from '@tsdi/unit';
import { KarmaReporter } from '@tsdi/unit-karma';

runTest('./test/**/*.ts', { baseURL: __dirname }, KarmaReporter);