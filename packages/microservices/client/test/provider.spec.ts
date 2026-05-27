import expect = require('expect');
import { Transport, TransferSide } from '@tsdi/common';
import {
    CLIENT_CONFIGS,
    MICRO_CLIENT_CIRCUIT_BREAKER_OPTIONS,
    MICRO_CLIENT_DISCOVERY_OPTIONS,
    MICRO_CLIENT_LOADBALANCE_OPTIONS,
    MICRO_CLIENT_RETRY_OPTIONS,
    provideClient,
    provideClientFromDi,
    withClientFeatures,
    withClientTransfers,
    withDiscovery,
    withLoadBalance
} from '../src/provider';
import { ClientFeatureKind } from '../src/options';

const createConfig = (name = 'alpha') => ({
    name,
    transport: Transport.TCP,
    side: TransferSide.client,
    microservice: true,
    features: {}
} as any);

describe('client provider', () => {
    it('throws when transport feature is missing', () => {
        expect(() => provideClient(withDiscovery())).toThrow(/transport feature is required/);
    });

    it('orders feature providers before transport providers', () => {
        const config = createConfig();
        const providers = provideClient(
            withDiscovery(),
            withLoadBalance(),
            {
                kind: ClientFeatureKind.Transport,
                config,
                providers: [{ provide: 'transport-provider', useValue: 'transport-provider' }]
            }
        ) as any[];

        const names = providers.map((provider: any) => provider.provide);
        expect(names.indexOf(MICRO_CLIENT_DISCOVERY_OPTIONS)).toBeGreaterThanOrEqual(0);
        expect(names.indexOf(MICRO_CLIENT_LOADBALANCE_OPTIONS)).toBeGreaterThanOrEqual(0);
        expect(names.indexOf('transport-provider')).toBeGreaterThan(names.indexOf(MICRO_CLIENT_LOADBALANCE_OPTIONS));
    });

    it('ignores mismatched feature configs', () => {
        const config = createConfig('matched');
        const providers = provideClient(
            withDiscovery(),
            {
                kind: ClientFeatureKind.Filters,
                config: { ...config, name: 'other' },
                providers: [{ provide: 'should-not-appear', useValue: true }]
            },
            {
                kind: ClientFeatureKind.Transport,
                config,
                providers: []
            }
        ) as any[];

        expect(providers.some((provider: any) => provider.provide === 'should-not-appear')).toBe(false);
    });

    it('adds default discovery, loadBalance and transfer features', () => {
        const config = createConfig();
        const features = withClientFeatures()(config) as any[];
        const kinds = features.map(feature => feature.kind);
        expect(kinds).toContain(ClientFeatureKind.Discovery);
        expect(kinds).toContain(ClientFeatureKind.LoadBalance);
        expect(kinds).toContain(ClientFeatureKind.Transfer);
        expect(kinds).not.toContain(ClientFeatureKind.CircuitBreaker);
        expect(kinds).not.toContain(ClientFeatureKind.Retry);
    });

    it('normalizes boolean retry and circuit breaker options', () => {
        const config = createConfig();
        const features = withClientFeatures({ retry: true, circuitBreaker: true })(config) as any[];
        const retry = features.find(feature => feature.kind === ClientFeatureKind.Retry);
        const breaker = features.find(feature => feature.kind === ClientFeatureKind.CircuitBreaker);
        expect(retry.providers[0].provide).toBe(MICRO_CLIENT_RETRY_OPTIONS);
        expect(retry.providers[0].useValue).toEqual({});
        expect(breaker.providers[0].provide).toBe(MICRO_CLIENT_CIRCUIT_BREAKER_OPTIONS);
        expect(breaker.providers[0].useValue).toEqual({});
    });

    it('uses default transfer when no transfer factory is provided', () => {
        const config = createConfig();
        const transfer = withClientTransfers()({
            ...config,
            features: {
                defaultTransfer: () => [() => undefined]
            }
        } as any) as any;
        expect(transfer.providers.length).toBeGreaterThan(2);
    });

    it('throws when provideClientFromDi cannot find matching config', () => {
        const [provider] = provideClientFromDi({ transport: Transport.TCP, name: 'missing' } as any) as any[];
        expect(() => provider.provider({ get: () => [] })).toThrow(/messings 1 microservice client configure, ailas with name missing/);
    });

    it('throws when provideClientFromDi finds config without transportFeature', () => {
        const [provider] = provideClientFromDi({ transport: Transport.TCP, name: 'alpha' } as any) as any[];
        const injector = {
            get: (token: any) => token === CLIENT_CONFIGS ? [createConfig('alpha')] : []
        };
        expect(() => provider.provider(injector)).toThrow(/messings transportFeature 1 microservice client configure, ailas with name alpha/);
    });
});
