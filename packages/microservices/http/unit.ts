/// <reference types="node" />
import { runTest } from '@tsdi/unit';

void runTest('./test/**/*.spec.ts', { baseURL: __dirname })
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
