import { runTest } from '@tsdi/unit';

void runTest([
    './test/http1.spec.ts',
    './test/http2.spec.ts',
    './test/https2.spec.ts'
], { baseURL: __dirname })
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
