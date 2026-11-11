import * as path from 'node:path';
import { startGatewayAdminServer } from '../src/server';

/**
 * Preview/dev entry used by `web/preview-test.js`.
 *
 * The production entry is `npm start` (`src/main.ts`). This file only adds a
 * demo route so the preview test can exercise the route table.
 */
const PORT = Number(process.argv[2] || process.env.GATEWAY_ADMIN_PORT || 4318);

startGatewayAdminServer({
    host: '127.0.0.1',
    port: PORT,
    prefix: '/admin',
    uiRoot: path.resolve(__dirname),
    routes: [{
        path: '/api/demo',
        service: 'demo-service',
        targetUrl: 'http://127.0.0.1:3999',
        stripPrefix: true
    }]
}).catch(error => {
    console.error(error);
    process.exit(1);
});
