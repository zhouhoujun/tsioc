import expect = require('expect');
import { Transport } from '@tsdi/common';
import {
    getTransportCapabilities,
    inspectTransportCapabilities,
    SERVICE_CAPABILITIES
} from '../src/capabilities';
import { provideService } from '../src/provider';
import { ServiceFeatureKind } from '../src/options';

describe('transport capabilities', () => {
    function transportConfig(transport: Transport, microservice = true) {
        return { transport, microservice, features: {} } as any;
    }

    function transportFeature(transport: Transport, microservice = true) {
        return {
            kind: ServiceFeatureKind.Transport,
            config: transportConfig(transport, microservice),
            providers: []
        } as any;
    }

    it('declares protocol semantics instead of letting callers infer them', () => {
        expect(getTransportCapabilities(Transport.HTTP)).toMatchObject({
            requestResponse: true,
            delivery: 'at-most-once',
            consumerIdempotency: false
        });
        expect(getTransportCapabilities(Transport.Kafka)).toMatchObject({
            requestResponse: true,
            publishSubscribe: true,
            delivery: 'both',
            consumerIdempotency: true,
            ordering: 'partition'
        });
        expect(getTransportCapabilities(Transport.MQTT)).toMatchObject({
            delivery: 'at-least-once',
            consumerIdempotency: true
        });
        expect(getTransportCapabilities(Transport.Redis)).toMatchObject({
            delivery: 'both',
            consumerIdempotency: false
        });
        expect(getTransportCapabilities(Transport.NATS)).toMatchObject({
            delivery: 'both',
            consumerIdempotency: true
        });
    });

    it('reports semantic warnings for weak delivery/idempotency', () => {
        const reports = inspectTransportCapabilities([
            transportConfig(Transport.MQTT),
            transportConfig(Transport.HTTP),
            transportConfig(Transport.HTTP, false)
        ]);
        expect(reports[0].warnings.join(' ')).not.toContain('consumer idempotency is not supported');
        expect(reports[1].warnings.join(' ')).toContain('at-most-once delivery');
        expect(reports[2].warnings).toEqual([]);
    });

    it('reports unknown transports with an actionable warning', () => {
        const report = inspectTransportCapabilities([transportConfig(999 as Transport)])[0];
        expect(report.warnings[0]).toContain("unknown transport '999'");
        expect(report.capabilities.requestResponse).toBe(false);
    });

    it('exposes the report through provideService', () => {
        const providers = provideService(transportFeature(Transport.Kafka)) as any[];
        const provider = providers.find((item: any) => item.provide === SERVICE_CAPABILITIES);
        expect(provider).toBeTruthy();
        expect(provider.useValue[0].capabilities.name).toBe('Kafka');
    });
});
