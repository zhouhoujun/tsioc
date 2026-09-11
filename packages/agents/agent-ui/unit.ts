import { runTest } from '@tsdi/unit';

runTest('./test/**/*.ts', { baseURL: __dirname })
    .then(() => process.exit(0))
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });
