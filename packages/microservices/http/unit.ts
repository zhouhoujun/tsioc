/// <reference types="node" />
import { runTest } from '@tsdi/unit';

const tests: string[] = [
    './test/http-microservice.spec.ts'
];

if (process.env.TSIO_TEST_HTTP) {
    tests.push('./test/**/*.spec.ts');
}

runTest(tests, { baseURL: __dirname })
