import expect = require('expect');
import { Transport } from '@tsdi/common';
import { getServiceInterceptorsToken, ServiceFeatureKind, useFeatures } from '@tsdi/service';
import { useTracing } from '../src/provider';
import { TracingInterceptor } from '../src/interceptors/tracing.interceptor';
import { TRACING_OPTIONS } from '../src/tokens';

describe('tracing composition via extraFeatures', () => {
    it('adds tracing interceptors without @tsdi/service importing tracing', () => {
        const config = {
            transport: Transport.HTTP,
            side: 0,
            microservice: true,
            features: {}
        } as any;
        const features = useFeatures({
            extraFeatures: [useTracing({ serviceName: 'composed-service', sampleRate: 0.25 })]
        } as any)(config) as any[];

        const providers = features.flatMap(feature => feature.providers ?? []);
        const token = getServiceInterceptorsToken(config);
        expect(features.some(feature => feature.kind === ServiceFeatureKind.Interceptors)).toBe(true);
        expect(providers.some((provider: any) =>
            provider.provide === token
            && provider.useExisting === TracingInterceptor
            && provider.multiOrder === -850)).toBe(true);
        expect(providers.some((provider: any) =>
            provider.provide === TRACING_OPTIONS
            && provider.useValue.serviceName === 'composed-service')).toBe(true);
    });
});
