import { runTest } from '@tsdi/unit';

void runTest([
    './test/transaction.spec.ts',
    './test/http2-transaction.spec.ts',
    './test/request-validation.spec.ts'
], { baseURL: __dirname })
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
