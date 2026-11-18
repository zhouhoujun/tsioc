// Designer UI suite: boots one real JSDOM application per test.
//
// Kept separate from `unit.ts` so the default run stays fast; run it with
// `npm run test:ui` (or `npm run test:all` for both).

import { runTest } from '@tsdi/unit';

runTest('./test/workflow-designer-ui.spec.ts', { baseURL: __dirname });
