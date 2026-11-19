// for unit test debug.

import { runTest } from '@tsdi/unit';

// The designer UI specs (`workflow-designer-ui-*.spec.ts`) boot a real JSDOM
// designer application per test. They are deliberately kept out of the default
// run: they dominate the suite (minutes instead of seconds) and need a large
// heap. Run them on their own with `npm run test:ui` (run-ui-tests.js).
runTest(['./test/**/*.ts', '!./test/workflow-designer-ui-*.spec.ts'], { baseURL: __dirname });
