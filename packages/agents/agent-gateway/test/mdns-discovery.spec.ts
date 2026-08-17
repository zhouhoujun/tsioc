import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { GatewayServer } from '../src/gateway/GatewayServer';
import { mdnsInternals } from '../src/discovery/MdnsServiceDiscovery';

@Suite('mDNS gateway discovery')
export class MdnsGatewayDiscoveryTest {
    @Test('encodes a DNS-SD announcement that discovery can resolve')
    resolvesAnnouncement() {
        const message = mdnsInternals.buildAnnouncement({
            port: 4317,
            host: '192.168.1.8',
            serviceType: '_custom-agent._tcp',
            domain: 'lan',
            name: 'Studio'
        });
        const gateways = mdnsInternals.gatewaysFromMessage(message, '192.168.1.9', '_custom-agent._tcp.lan');
        expect(gateways.length).toEqual(1);
        expect(gateways[0].name).toEqual('Studio');
        expect(gateways[0].url).toEqual('http://192.168.1.8:4317');
        expect(gateways[0].txt.path).toEqual('/rpc');
    }

    @Test('normalizes service type and domain')
    normalizesService() {
        expect(mdnsInternals.qualifiedService('_tsdi-agent._tcp.', '.local.')).toEqual('_tsdi-agent._tcp.local');
        expect(mdnsInternals.qualifiedService('_tsdi-agent._tcp.local', 'local')).toEqual('_tsdi-agent._tcp.local');
    }

    @Test('encodes a PTR discovery question')
    encodesQuery() {
        const query = mdnsInternals.buildQuery('_tsdi-agent._tcp.local');
        expect(mdnsInternals.questionNames(query)).toEqual(['_tsdi-agent._tcp.local']);
    }

    @Test('gateway advertises after listen and stops discovery on shutdown')
    async gatewayLifecycle() {
        const calls: any[] = [];
        const mdns = {
            advertise: async (options: any) => calls.push(['advertise', options]),
            stop: async () => calls.push(['stop'])
        };
        const server = new GatewayServer(
            { authenticate: async () => true } as any,
            { checkAndRespond: () => true } as any,
            {} as any,
            { host: '127.0.0.1', port: 0, mdns: true, mdnsServiceType: '_custom._tcp', mdnsDomain: 'lan', mdnsName: 'Desk' },
            mdns as any
        );
        await server.start();
        expect(calls[0][0]).toEqual('advertise');
        expect(calls[0][1].port).toBeGreaterThan(0);
        expect(calls[0][1].serviceType).toEqual('_custom._tcp');
        expect(calls[0][1].domain).toEqual('lan');
        await server.stop();
        expect(calls[1]).toEqual(['stop']);
    }

    @Test('gateway does not advertise when mDNS is disabled')
    async disabledByDefault() {
        let advertised = false;
        const server = new GatewayServer(
            { authenticate: async () => true } as any,
            { checkAndRespond: () => true } as any,
            {} as any,
            { host: '127.0.0.1', port: 0 },
            { advertise: async () => { advertised = true; }, stop: async () => undefined } as any
        );
        await server.start();
        await server.stop();
        expect(advertised).toBe(false);
    }
}
