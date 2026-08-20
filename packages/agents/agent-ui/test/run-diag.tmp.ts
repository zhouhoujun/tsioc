import { runTest } from '@tsdi/unit';
runTest('./test/console-renderer.spec.ts', { baseURL: __dirname })
    .then(() => process.exit(0))
    .catch((err: Error) => { console.error('RUNNER-FAIL', err); process.exit(1); });
