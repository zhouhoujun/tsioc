// for unit test debug.

import { runTest } from '@tsdi/unit';

// `workflow-designer-ui.spec.ts` boots a real JSDOM designer application per
// test. It is deliberately kept out of the default run: it dominates the suite
// (minutes instead of seconds) and needs a large heap. Run it on its own with
// `npm run test:ui` (see unit-ui.ts).
runTest(['./test/**/*.ts', '!./test/workflow-designer-ui.spec.ts'], { baseURL: __dirname });
