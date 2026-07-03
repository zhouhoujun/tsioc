import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { HmacSignatureService, HttpAuthService, JWTService } from '@tsdi/security';
import { WebhookAgentChannel } from '../src/adapters/WebhookAgentChannel';

@Suite('Webhook agent channel')
export class WebhookAgentChannelTest {
    @Test('verifies webhook hmac signatures with shared security service')
    verifiesHmacSignature() {
        const signatures = new HmacSignatureService();
        const channel = new WebhookAgentChannel(signatures, new HttpAuthService(), { secret: 'secret' });
        const body = Buffer.from('{"content":"hello"}');
        const valid = signatures.sign(body, 'secret');
        expect((channel as any).verifySignature(body, valid)).toBe(true);
        expect((channel as any).verifySignature(body, 'deadbeef')).toBe(false);
        expect((channel as any).verifySignature(body, valid.slice(1))).toBe(false);
    }

    @Test('enforces bearer auth when configured alongside signature auth')
    async enforcesBearerAuth() {
        const signatures = new HmacSignatureService();
        const channel = new WebhookAgentChannel(signatures, new HttpAuthService(), {
            secret: 'secret',
            auth: { bearerToken: 'gateway-token' }
        });
        const authorized = { headers: { authorization: 'Bearer gateway-token' } } as any;
        const unauthorized = { headers: { authorization: 'Bearer wrong-token' } } as any;
        expect(await (channel as any).isAuthorized(authorized)).toBe(true);
        expect(await (channel as any).isAuthorized(unauthorized)).toBe(false);
    }

    @Test('accepts jwt auth when configured alongside signature auth')
    async acceptsJwtAuth() {
        const signatures = new HmacSignatureService();
        const jwtService = new JWTService();
        const token = await jwtService.sign({ sub: 'webhook-user' }, { privateKey: 'secret-key' as any });
        const channel = new WebhookAgentChannel(signatures, new HttpAuthService(jwtService), {
            secret: 'secret',
            auth: {
                jwt: {
                    publicKey: 'secret-key' as any,
                    algorithms: ['HS256']
                }
            }
        });
        const authorized = { headers: { authorization: `Bearer ${token}` } } as any;
        expect(await (channel as any).isAuthorized(authorized)).toBe(true);
    }

    @Test('rejects invalid jwt auth when configured alongside signature auth')
    async rejectsInvalidJwtAuth() {
        const signatures = new HmacSignatureService();
        const channel = new WebhookAgentChannel(signatures, new HttpAuthService(), {
            secret: 'secret',
            auth: {
                jwt: {
                    publicKey: 'secret-key' as any,
                    algorithms: ['HS256']
                }
            }
        });
        const unauthorized = { headers: { authorization: 'Bearer invalid-token' } } as any;
        expect(await (channel as any).isAuthorized(unauthorized)).toBe(false);
    }

    @Test('accepts query token on webhook request when auth is enabled')
    async acceptsQueryToken() {
        const channel = new WebhookAgentChannel({ auth: { bearerToken: 'secret' } });
        const req = {
            headers: { host: 'localhost' },
            url: '/webhook?token=secret'
        } as any;
        expect(await (channel as any).isAuthorized(req)).toBe(true);
    }
}
