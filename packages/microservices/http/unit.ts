/// <reference types="node" />
import { runTest } from '@tsdi/unit';

runTest('./test/**/*.spec.ts', { baseURL: __dirname })
