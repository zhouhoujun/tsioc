// Designer UI suite entry point. The specs are split into three files that
// `run-ui-tests.js` runs in parallel processes; this file exists for running
// one part manually (see unit-ui-a/b/c.ts).

import { runTest } from '@tsdi/unit';

runTest('./test/workflow-designer-ui-a.spec.ts', { baseURL: __dirname });
