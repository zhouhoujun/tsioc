import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { HttpAuthService } from '@tsdi/security';
import { JWTService } from '@tsdi/security';
import { SSEAgentChannel } from '../src/adapters/SSEAgentChannel';

@Suite('SSE agent channel auth')
export class SSEAgentChannelAuthTest {
    @Test('rejects sse request without valid token when auth is enabled')
    async rejectsUnauthorized() {
        const channel = new SSEAgentChannel(new HttpAuthService(), { auth: { bearerToken: 'secret' } });
        const req = { headers: {} } as any;
        expect(await (channel as any).isAuthorized(req)).toBe(false);
    }

    @Test('accepts sse request with valid token when auth is enabled')
    async acceptsAuthorized() {
        const channel = new SSEAgentChannel(new HttpAuthService(), { auth: { bearerToken: 'secret' } });
        const req = { headers: { authorization: 'Bearer secret' } } as any;
        expect(await (channel as any).isAuthorized(req)).toBe(true);
    }

    @Test('accepts sse request with valid jwt token when auth is enabled')
    async acceptsJwtAuthorized() {
        const jwtService = new JWTService();
        const token = await jwtService.sign({ sub: 'sse-user' }, { privateKey: 'secret-key' as any });
        const channel = new SSEAgentChannel(new HttpAuthService(jwtService), {
            auth: {
                jwt: {
                    publicKey: 'secret-key' as any,
                    algorithms: ['HS256']
                }
            }
        });
        const req = { headers: { authorization: `Bearer ${token}` } } as any;
        expect(await (channel as any).isAuthorized(req)).toBe(true);
    }

    @Test('rejects sse request with invalid jwt token when auth is enabled')
    async rejectsInvalidJwt() {
        const channel = new SSEAgentChannel(new HttpAuthService(), {
            auth: {
                jwt: {
                    publicKey: 'secret-key' as any,
                    algorithms: ['HS256']
                }
            }
        });
        const req = { headers: { authorization: 'Bearer invalid-token' } } as any;
        expect(await (channel as any).isAuthorized(req)).toBe(false);
    }

    @Test('accepts query token on sse request when auth is enabled')
    async acceptsQueryToken() {
        const channel = new SSEAgentChannel({ auth: { bearerToken: 'secret' } });
        const req = {
            headers: { host: 'localhost' },
            url: '/sse?token=secret'
        } as any;
        expect(await (channel as any).isAuthorized(req)).toBe(true);
    }
}
