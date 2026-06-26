/// <reference types="node" />
import { runTest } from '@tsdi/unit';

const tests: string[] = [
    './test/tcp-client-options.spec.ts',
    './test/tcp-controller-metadata.spec.ts',
    './test/tcp-microservice.spec.ts',
    './test/tcp-request.spec.ts'
];

if (process.env.TSIO_TEST_TCP) {
    tests.push('./test/**/*.spec.ts');
}

runTest(tests, { baseURL: __dirname });
