import { runTest } from '@tsdi/unit';
import { ConsoleReporter } from '@tsdi/unit-console';

runTest('./test/**/*.spec.ts', { baseURL: __dirname }, ConsoleReporter);