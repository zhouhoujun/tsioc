import expect = require('expect');
import { Transport, TransferSide } from '@tsdi/common';
import {
    getClientGuardsToken,
    getClientFiltersToken,
    getClientTransferFiltersToken,
    getClientInterceptorsToken,
    getClientOptionsToken,
    getClientHandlerToken,
    getClientBackendToken,
    getClientToken
} from '../src/tokens';
import { ClientConfig } from '../src/options';

function createConfig(overrides: Partial<ClientConfig> = {}): ClientConfig {
    return {
        transport: Transport.TCP,
        side: TransferSide.client,
        microservice: true,
        features: {},
        ...overrides
    } as ClientConfig;
}

describe('client tokens', () => {
    describe('getClientGuardsToken', () => {
        it('returns a unique token', () => {
            const config = createConfig();
            const token = getClientGuardsToken(config);
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
        });

        it('returns consistent token for same config', () => {
            const tokenA = getClientGuardsToken(createConfig());
            const tokenB = getClientGuardsToken(createConfig());
            expect(tokenA).toBe(tokenB);
        });

        it('sets guardsToken on config features', () => {
            const config = createConfig();
            expect(config.features.guardsToken).toBeUndefined();
            getClientGuardsToken(config);
            expect(config.features.guardsToken).toBeDefined();
        });

        it('does not overwrite existing guardsToken', () => {
            const config = createConfig();
            config.features.guardsToken = 'custom-guards-token' as any;
            const token = getClientGuardsToken(config);
            expect(token).toBe('custom-guards-token');
        });
    });

    describe('getClientFiltersToken', () => {
        it('returns a unique token', () => {
            const token = getClientFiltersToken(createConfig());
            expect(token).toBeDefined();
        });

        it('returns tokens with TCP_MICRO prefix for TCP microservice', () => {
            const config = createConfig({ transport: Transport.TCP, microservice: true });
            const token = getClientFiltersToken(config);
            expect(token).toContain('TCP_MICRO');
        });

        it('returns tokens with HTTP prefix for HTTP', () => {
            const config = createConfig({ transport: Transport.HTTP, microservice: false });
            const token = getClientFiltersToken(config);
            expect(token).toContain('HTTP');
            expect(token).not.toContain('MICRO');
        });

        it('sets filtersToken on config features', () => {
            const config = createConfig();
            expect(config.features.filtersToken).toBeUndefined();
            getClientFiltersToken(config);
            expect(config.features.filtersToken).toBeDefined();
        });
    });

    describe('getClientTransferFiltersToken', () => {
        it('returns a transfer filters token', () => {
            const token = getClientTransferFiltersToken(createConfig());
            expect(token).toBeDefined();
            expect(String(token)).toContain('TRANSFER_FILTERS');
        });
    });

    describe('getClientInterceptorsToken', () => {
        it('returns an interceptors token', () => {
            const token = getClientInterceptorsToken(createConfig());
            expect(token).toBeDefined();
            expect(String(token)).toContain('INTERCEPTORS');
        });

        it('generates different tokens for different transports', () => {
            const tcpToken = getClientInterceptorsToken(createConfig({ transport: Transport.TCP }));
            const httpToken = getClientInterceptorsToken(createConfig({ transport: Transport.HTTP }));
            expect(tcpToken).not.toBe(httpToken);
        });

        it('generates different tokens for microservice vs host mode', () => {
            const msToken = getClientInterceptorsToken(createConfig({ transport: Transport.TCP, microservice: true }));
            const hostToken = getClientInterceptorsToken(createConfig({ transport: Transport.TCP, microservice: false }));
            expect(msToken).not.toBe(hostToken);
        });

        it('generates different tokens for different names', () => {
            const alpha = getClientInterceptorsToken(createConfig({ name: 'alpha' }));
            const beta = getClientInterceptorsToken(createConfig({ name: 'beta' }));
            expect(alpha).not.toBe(beta);
        });
    });

    describe('getClientOptionsToken', () => {
        it('returns an options token including transport and name', () => {
            const config = createConfig({ transport: Transport.UDP, name: 'data-feed' });
            const token = getClientOptionsToken(config);
            const str = String(token);
            expect(str).toContain('UDP');
            expect(str).toContain('MICRO');
            expect(str).toContain('data-feed');
        });

        it('omits MICRO suffix for host-mode configs', () => {
            const config = createConfig({ transport: Transport.TCP, microservice: false });
            const token = getClientOptionsToken(config);
            expect(String(token)).not.toContain('MICRO');
        });
    });

    describe('getClientHandlerToken', () => {
        it('returns a handler token', () => {
            const token = getClientHandlerToken(createConfig());
            expect(token).toBeDefined();
            expect(String(token)).toContain('HANDLER');
        });
    });

    describe('getClientBackendToken', () => {
        it('returns a backend token', () => {
            const config = createConfig();
            expect(config.features.backendToken).toBeUndefined();
            const token = getClientBackendToken(config);
            expect(token).toBeDefined();
            expect(String(token)).toContain('BACKEND');
        });

        it('sets backendToken on config features', () => {
            const config = createConfig();
            getClientBackendToken(config);
            expect(config.features.backendToken).toBeDefined();
        });
    });

    describe('getClientToken', () => {
        it('returns a client token', () => {
            const token = getClientToken(createConfig());
            expect(token).toBeDefined();
            expect(String(token)).toContain('CLIENT');
        });

        it('returns consistent token for same config', () => {
            const tokenA = getClientToken(createConfig({ transport: Transport.WS, name: 'ws-client' }));
            const tokenB = getClientToken(createConfig({ transport: Transport.WS, name: 'ws-client' }));
            expect(tokenA).toBe(tokenB);
        });
    });
});
