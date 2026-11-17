// for unit test debug.

import { runTest } from '@tsdi/unit';

runTest(['./test/**/*.ts', './http/test/**/*.ts'], { baseURL: __dirname });
