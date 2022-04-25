// for unit test debug.

import { runTest } from '@tsdi/unit';
import { ConsoleReporter } from '@tsdi/unit-console';

runTest('./**/*.ts', { baseURL: __dirname }, ConsoleReporter);
