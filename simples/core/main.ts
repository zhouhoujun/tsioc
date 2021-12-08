import { Application } from '@tsdi/core';
import { MockTransBootTest, connections } from './src/app';

Application.run({
    type: MockTransBootTest,
    baseURL: __dirname,
    configures: [
        {
            models: ['./src/models/**/*.ts'],
            repositories: ['./src/repositories/**/*.ts'],
            connections
        }
    ]
});