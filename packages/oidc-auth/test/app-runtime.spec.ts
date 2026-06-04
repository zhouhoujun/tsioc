import expect = require('expect');
import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useCookie, useRouter } from '@tsdi/service';
import { useHttpTransport } from '@tsdi/http';
import * as http from 'node:http';
import { AuthController } from '../src/controllers/AuthController';
import { OIDCService } from '../src/auth/OIDCService';

class OIDCServiceRuntimeStub {
    authenticate(state?: string, nonce?: string) {
        return {
            url: `https://issuer.example/auth?state=${state ?? 'runtime-state'}`,
            state: state ?? 'runtime-state',
            nonce: nonce ?? 'runtime-nonce'
        };
    }

    async handleCallback(_code: string, _state: string, expectedState: string, expectedNonce: string): Promise<any> {
        return {
            expectedState,
            expectedNonce,
            user: { sub: 'runtime-user', email: 'runtime@example.com' },
            claims: { sub: 'runtime-user' },
            tokens: { accessToken: 'at', refreshToken: 'rt', idToken: 'idt' }
        };
    }

    async createSessionToken(): Promise<string> {
        return 'runtime-session-token';
    }

    async verifySessionToken(token: string): Promise<any> {
        if (token === 'runtime-session-token') {
            return { sub: 'runtime-user', email: 'runtime@example.com', provider: 'issuer' };
        }
        return null;
    }

    get issuer(): string {
        return 'https://issuer.example';
    }

    async refreshAccessToken(refreshToken: string): Promise<any> {
        return { accessToken: `new-${refreshToken}`, refreshToken: 'rt2', idToken: 'idt2' };
    }
}

const PORT = 21315;

describe('OIDC auth app runtime', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [AuthController],
        providers: [
            { provide: OIDCService, useClass: OIDCServiceRuntimeStub },
            provideService(
                useRouter(),
                useCookie(),
                useHttpTransport({ listenOpts: { port: PORT, host: '127.0.0.1' }, asDefault: true })
            )
        ]
    })
    class RuntimeApp { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(RuntimeApp);
    });

    after(async () => {
        await ctx?.close();
    });

    it('serves login endpoint with oidc cookies through microservice http runtime', async () => {
        const result = await new Promise<{ status: number; body: any; cookies: string[] }>((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port: PORT,
                path: '/auth/login',
                method: 'GET'
            }, (res) => {
                let text = '';
                res.setEncoding('utf8');
                res.on('data', chunk => text += chunk);
                res.on('end', () => {
                    try {
                        const setCookie = res.headers['set-cookie'];
                        resolve({
                            status: res.statusCode ?? 0,
                            body: JSON.parse(text),
                            cookies: Array.isArray(setCookie) ? setCookie : (setCookie ? [String(setCookie)] : [])
                        });
                    } catch (err) {
                        reject(err);
                    }
                });
            });
            req.on('error', reject);
            req.end();
        });

        expect(result.status).toBe(200);
        expect(result.body.url).toContain('https://issuer.example/auth');
    });
});
