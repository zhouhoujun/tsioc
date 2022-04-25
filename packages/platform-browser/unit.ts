// for unit test debug.

import { runTest } from '@tsdi/unit';
import { ConsoleReporter } from '@tsdi/unit-console';

runTest('./test/**/*.ts', { baseURL: __dirname }, ConsoleReporter);
