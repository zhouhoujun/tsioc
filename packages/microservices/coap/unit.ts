/// <reference types="node" />
import { runTest } from '@tsdi/unit';

const tests: string[] = [
    './test/coap-client-backend.spec.ts',
    './test/coap-microservice.spec.ts'
];

if (process.env.TSIO_TEST_COAP) {
    tests.push('./test/**/*.spec.ts');
}

runTest(tests, { baseURL: __dirname });
