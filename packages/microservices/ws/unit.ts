/// <reference types="node" />
import { runTest } from '@tsdi/unit';

const tests: string[] = [
    './test/ws-message-adapter.spec.ts',
    './test/ws-microservice.spec.ts'
];

if (process.env.TSIO_TEST_WS) {
    tests.push('./test/**/*.spec.ts');
}

runTest(tests, { baseURL: __dirname });
