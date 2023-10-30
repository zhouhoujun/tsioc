// for unit test debug.

import { runTest } from '@tsdi/unit';
import { ConsoleReporter } from '@tsdi/unit-console';

runTest(
    './test/**/*.ts',
    // './test/**/tcp.spec.ts',
    { baseURL: __dirname },
    ConsoleReporter);
