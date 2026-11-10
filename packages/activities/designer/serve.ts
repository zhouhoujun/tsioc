import * as path from 'path';
import { startWorkflowHttpServer } from '../server';

/**
 * Run the product designer through the framework's HTTP microservice:
 *   - static designer under /
 *   - workflows API under /api/workflows
 *
 *   npx ts-node -r tsconfig-paths/register designer/serve.ts [port]
 */
(async () => {
    const port = Number(process.argv[2] || process.env.PORT || 8765);
    const ctx = await startWorkflowHttpServer({
        port,
        host: '127.0.0.1',
        staticRoot: path.resolve(__dirname)
    });
    console.log(`Workflow Designer: http://127.0.0.1:${port}/`);
    console.log(`Workflows API:     http://127.0.0.1:${port}/api/workflows`);

    const shutdown = async () => {
        await ctx.close();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
})().catch(error => {
    console.error(error);
    process.exit(1);
});
