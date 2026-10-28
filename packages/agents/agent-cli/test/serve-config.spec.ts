import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { buildServeGatewayConfig, resolveAgentWebDir } from '../src/serve';

@Suite('`serve` gateway config')
export class ServeGatewayConfigTest {
    @Test('loopback stays tokenless unless one is provided and keeps the assets')
    loopback() {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-serve-config-'));
        fs.writeFileSync(path.join(dir, 'index.html'), '<html></html>');
        try {
            const config = buildServeGatewayConfig({ webHost: '127.0.0.1', webPort: 4100 }, dir);
            expect(config.host).toEqual('127.0.0.1');
            expect(config.port).toEqual(4100);
            expect(config.authToken).toEqual(undefined);
            expect(config.staticDir).toEqual(dir);
            expect(config.cors).toEqual(false);
            expect(config.mdns).toEqual(false);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('a non-loopback bind without a token generates one and enables mDNS')
    nonLoopback() {
        const config = buildServeGatewayConfig({ webHost: '0.0.0.0', webPort: '4101', mdns: true });
        expect(config.host).toEqual('0.0.0.0');
        expect(config.port).toEqual(4101);
        expect(typeof config.authToken).toEqual('string');
        expect((config.authToken || '').length).toBeGreaterThan(16);
        expect(config.mdns).toEqual(true);
        expect(config.staticDir).toEqual(undefined);

        const explicit = buildServeGatewayConfig({ webHost: '0.0.0.0', token: 'keep-me' });
        expect(explicit.authToken).toEqual('keep-me');
    }

    @Test('web assets resolve from the monorepo layout')
    webAssets() {
        const dir = resolveAgentWebDir();
        expect(!!dir).toEqual(true);
        expect(fs.existsSync(path.join(dir as string, 'index.html'))).toEqual(true);
    }
}
