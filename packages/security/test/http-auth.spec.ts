import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { JWTService } from '../src/jwt/jwt.service';
import { HttpAuthService } from '../src/http/http-auth.service';
import { HmacSignatureService } from '../src/signature/hmac-signature.service';
import { WechatSignatureService } from '../src/wechat/wechat-signature.service';

@Suite('Shared HTTP auth service')
export class HttpAuthServiceTest {
    @Test('extracts bearer token from authorization websocket and query with precedence')
    extractsToken() {
        const service = new HttpAuthService();
        const req = {
            headers: {
                authorization: 'Bearer header-token',
                'sec-websocket-protocol': 'bearer.ws-token',
                host: 'localhost'
            },
            url: '/ws/chat?token=query-token'
        } as any;

        expect(service.extractToken(req)).toBe('header-token');
        expect(service.extractToken({ headers: { 'sec-websocket-protocol': 'bearer.ws-token' } } as any)).toBe('ws-token');
        expect(service.extractToken({ headers: { host: 'localhost' }, url: '/ws/chat?token=query-token' } as any)).toBe('query-token');
    }

    @Test('respects token extraction flags for query and websocket protocol')
    extractionFlags() {
        const service = new HttpAuthService();
        expect(service.extractToken({ headers: { host: 'localhost' }, url: '/ws/chat?token=query-token' } as any, {
            allowQueryToken: false
        })).toBeNull();
        expect(service.extractToken({ headers: { 'sec-websocket-protocol': 'bearer.ws-token' } } as any, {
            allowWebSocketProtocolToken: false
        })).toBeNull();
    }

    @Test('verifies configured bearer token safely')
    verifiesBearerToken() {
        const service = new HttpAuthService();
        expect(service.verifyBearerToken('secret', 'secret')).toBe(true);
        expect(service.verifyBearerToken('wrong', 'secret')).toBe(false);
        expect(service.verifyBearerToken(null, 'secret')).toBe(false);
        expect(service.verifyBearerToken('secret', '')).toBe(false);
        expect(service.verifyBearerToken('short', 'longer-token')).toBe(false);
    }

    @Test('verifies jwt token with shared jwt service')
    async verifiesJwtToken() {
        const jwtService = new JWTService();
        const service = new HttpAuthService(jwtService);
        const token = await jwtService.sign({ sub: 'u-1', role: 'admin' }, { privateKey: 'secret-key' as any });
        const claims = await service.verifyJwtToken(token, { publicKey: 'secret-key' as any, algorithms: ['HS256'] });
        expect(claims.sub).toBe('u-1');
    }

    @Test('authenticates bearer strategy without allowing query fallback override')
    async authenticateBearer() {
        const service = new HttpAuthService();
        const result = await service.authenticate({
            headers: { authorization: 'Bearer secret-token', host: 'localhost' },
            url: '/x?token=query-token'
        } as any, {
            bearerToken: 'secret-token',
            allowQueryToken: false
        });
        expect(result.authenticated).toBe(true);
        expect(result.token).toBe('secret-token');
    }
}

@Suite('Shared signature services')
export class SignatureServiceTest {
    @Test('signs and verifies webhook hmac payload safely')
    verifiesHmac() {
        const service = new HmacSignatureService();
        const body = Buffer.from('{"content":"hello"}');
        const signature = service.sign(body, 'secret');
        expect(service.verify(body, signature, 'secret')).toBe(true);
        expect(service.verify(body, 'deadbeef', 'secret')).toBe(false);
        expect(service.verify(body, signature.slice(1), 'secret')).toBe(false);
    }

    @Test('signs and verifies wechat signature')
    verifiesWechatSignature() {
        const service = new WechatSignatureService();
        const signature = service.sign('token', '1710000000', 'nonce');
        expect(service.verify(signature, 'token', '1710000000', 'nonce')).toBe(true);
        expect(service.verify('deadbeef', 'token', '1710000000', 'nonce')).toBe(false);
    }
}
