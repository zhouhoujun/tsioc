import { Transport } from '@tsdi/common';
import expect = require('expect');
import { withMcpTransport, mcpTransportFactory } from '../src/server';
import { withMcpClientTransport } from '../src/client';

const PORT = 21400;

describe('MCP Transport E2E', () => {
    describe('Microservice Mode (microservice: true)', () => {
        it('factory creates feature with microservice config', () => {
            const feature = mcpTransportFactory({ microservice: true, listenOpts: { port: PORT, host: '127.0.0.1' }, asDefault: true });
            expect((feature.config as any).transport).toBe(Transport.MCP);
            expect((feature.config as any).microservice).toBe(true);
            expect((feature.config as any).listenOpts?.port).toBe(PORT);
            expect(feature.providers.length).toBeGreaterThan(0);
        });
        it('client transport factory works', () => {
            const features = withMcpClientTransport({ url: `http://127.0.0.1:${PORT}`, microservice: true });
            expect(features[0].config.transport).toBe(Transport.MCP);
        });
    });
    describe('Host Service Mode (microservice: false)', () => {
        it('factory creates feature with host config', () => {
            const feature = mcpTransportFactory({ microservice: false as any, listenOpts: { port: PORT + 1 }, asDefault: true });
            expect((feature.config as any).microservice).toBe(false);
        });
    });
});
