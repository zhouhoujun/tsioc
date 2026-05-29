import { McpServer, McpServOptions, mcpTransportFactory, useMcpTransport, MCP_SERV_OPTIONS } from '../src/server';
import { withMcpTransport, MCP_CLIENT_OPTIONS } from '../src/client';
import { Transport, TransferSide } from '@tsdi/common';
import expect = require('expect');

describe('MCP Microservice', () => {
    describe('McpServOptions', () => {
        it('should create valid MCP server options', () => {
            const options: Partial<McpServOptions> = { transport: Transport.MCP, side: TransferSide.server, microservice: true, listenOpts: { port: 3100 } };
            expect(options.transport).toBe(Transport.MCP);
            expect(options.listenOpts?.port).toBe(3100);
        });
    });

    describe('mcpTransportFactory', () => {
        it('should create a valid MCP transport feature', () => {
            const feature = mcpTransportFactory({ listenOpts: { port: 3100 } });
            expect(feature.config.transport).toBe(Transport.MCP);
            expect(feature.config.microservice).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });
        it('should include MCP_SERV_OPTIONS provider', () => {
            const feature = mcpTransportFactory({ listenOpts: { port: 3100 } });
            const has = feature.providers.some((p: any) => p.provide === MCP_SERV_OPTIONS) ||
                ((feature.config as any).providers || []).some((p: any) => p.provide === MCP_SERV_OPTIONS);
            expect(has).toBe(true);
        });
        it('should use json packet transfer by default', () => {
            expect(mcpTransportFactory({ listenOpts: { port: 3100 } }).config.features?.defaultTransfer).toBeDefined();
        });
    });

    describe('useMcpTransport', () => {
        it('should create multiple transport features', () => {
            expect(useMcpTransport({ listenOpts: { port: 3100 } }, { listenOpts: { port: 3101 } }).length).toBe(2);
        });
    });

    describe('withMcpTransport', () => {
        it('should use json packet transfer by default', () => {
            expect(withMcpTransport({ url: 'http://localhost:3100' })[0].config.features?.defaultTransfer).toBeDefined();
        });
    });

    describe('tokens', () => {
        it('MCP_SERV_OPTIONS should be defined', () => expect(MCP_SERV_OPTIONS.toString()).toContain('MCP_SERV_OPTIONS'));
        it('MCP_CLIENT_OPTIONS should be defined', () => expect(MCP_CLIENT_OPTIONS.toString()).toContain('MCP_CLIENT_OPTIONS'));
    });

    describe('McpServer', () => {
        it('should exist as a class', () => expect(typeof McpServer).toBe('function'));
    });
});
