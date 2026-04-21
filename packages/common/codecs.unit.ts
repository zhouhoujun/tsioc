import { runTest } from '@tsdi/unit';

runTest('./src/codecs/test/*.spec.ts', { baseURL: __dirname });