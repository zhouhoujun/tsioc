import expect = require('expect');
import * as http from 'node:http';
import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useCookie, useJson, useRouter } from '@tsdi/service';
import { HttpServer, useHttpTransport } from '@tsdi/http';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AuthUserEntity } from '../src/models/AuthUser';
import { OIDCModule } from '../src/auth/OIDCModule';
import { OIDCService } from '../src/auth/OIDCService';
import { AuthController } from '../src/controllers/AuthController';
import { Suite, Test, Before, After } from '@tsdi/unit';

function request(
    port: number,
    path: string,
    options?: { method?: string; headers?: http.OutgoingHttpHeaders; body?: string }
): Promise<{ status: number; body: any; text: string; headers: http.IncomingHttpHeaders }> {
    return new Promise((resolve, reject) => {
        const req = http.request({
            host: '127.0.0.1',
            port,
            path,
            method: options?.method ?? 'GET',
            headers: options?.headers
        }, (res) => {
            let text = '';
            res.setEncoding('utf8');
            res.on('data', chunk => text += chunk);
            res.on('end', () => {
                let body: any = null;
                try {
                    body = text ? JSON.parse(text) : null;
                } catch {
                    body = text;
                }
                resolve({ status: res.statusCode ?? 0, body, text, headers: res.headers });
            });
        });
        req.on('error', reject);
        if (options?.body) {
            req.write(options.body);
        }
        req.end();
    });
}

function postJson(port: number, path: string, payload: any, headers?: http.OutgoingHttpHeaders) {
    const body = JSON.stringify(payload);
    return request(port, path, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(body),
            ...(headers ?? {})
        },
        body
    });
}

function register(port: number, username: string, password = 'secret-pass', email = `${username}@example.com`) {
    return postJson(port, '/auth/register', { username, password, email });
}

function login(port: number, username: string, password = 'secret-pass') {
    return postJson(port, '/auth/login', { username, password });
}

@Module({
    imports: [
        LoggerModule,
        OIDCModule.withPersistence({
            connection: {
                type: 'sqljs',
                autoSave: false,
                synchronize: true,
                logging: false,
                entities: [AuthUserEntity]
            } as any,
            auth: {
                clientId: 'test-client',
                clientSecret: 'test-secret',
                issuer: 'https://issuer.example',
                jwt: { secret: 'typeorm-test-secret', issuer: 'https://issuer.example' }
            },
            allowRegistration: true
        })
    ],
    declarations: [
        AuthController
    ],
    providers: [
        provideService(
            useRouter(),
            useCookie(),
            useJson(),
            useHttpTransport({ listenOpts: { port: 0, host: '127.0.0.1' }, asDefault: true })
        )
    ]
})
class TypeOrmAuthApp { }

@Suite('TypeORM auth persistence')
export class TypeOrmAuthPersistenceTest {
    private ctx!: ApplicationContext;
    private port!: number;

    @Before()
    async before() {
        this.ctx = await Application.run(TypeOrmAuthApp);
        const serverRef = this.ctx.runners.getRef(HttpServer as any) as { instance: { server: http.Server } };
        const address = serverRef.instance.server.address();
        if (!address || typeof address === 'string') {
            throw new Error('Unable to resolve bound port');
        }
        this.port = address.port;
    }

    @After()
    async after() {
        await this.ctx?.close();
    }

    @Test('registers a user through the HTTP auth service and persists it with TypeORM')
    async registerPersistsUser() {
        const result = await register(this.port, 'alice');

        expect(result.status).toBe(200);
        expect(result.body.user.username).toBe('alice');
        expect(result.body.accessToken).toBeTruthy();
        expect(result.body.refreshToken).toBeTruthy();

        const adapter = this.ctx.get(TypeormAdapter);
        const repo = adapter.getRepository(AuthUserEntity);
        const user = await repo.findOne({ where: { username: 'alice' } });
        expect(user).toBeTruthy();
        expect(user!.email).toBe('alice@example.com');
        expect(user!.passwordHash!.startsWith('scrypt$')).toBe(true);
        expect(user!.passwordHash).not.toContain('secret-pass');
    }

    @Test('logs in, verifies the bearer token and introspects it')
    async loginVerifyAndIntrospect() {
        await register(this.port, 'bob');
        const loginResult = await login(this.port, 'bob');
        expect(loginResult.status).toBe(200);
        expect(loginResult.body.user.username).toBe('bob');
        const accessToken = loginResult.body.accessToken;
        const refreshToken = loginResult.body.refreshToken;
        expect(accessToken).toBeTruthy();
        expect(refreshToken).toBeTruthy();

        const verify = await request(this.port, '/auth/verify', {
            headers: { authorization: `Bearer ${accessToken}` }
        });
        expect(verify.status).toBe(200);
        expect(verify.body.valid).toBe(true);
        expect(verify.body.tokenType).toBe('access');
        expect(verify.body.user.username).toBe('bob');

        const introspect = await postJson(this.port, '/auth/introspect', { token: accessToken });
        expect(introspect.status).toBe(200);
        expect(introspect.body.active).toBe(true);
        expect(introspect.body.username).toBe('bob');

        const invalid = await request(this.port, '/auth/verify', {
            headers: { authorization: 'Bearer not-a-token' }
        });
        expect(invalid.status).toBe(401);
        expect(invalid.body.valid).toBe(false);
    }

    @Test('rejects duplicate registration, invalid credentials and missing tokens')
    async rejectsInvalidRequests() {
        await register(this.port, 'carol');

        const duplicate = await register(this.port, 'carol', 'another-pass');
        expect(duplicate.status).toBe(400);
        expect(duplicate.body.error).toContain('already exists');

        const badLogin = await login(this.port, 'carol', 'wrong-pass');
        expect(badLogin.status).toBe(401);
        expect(badLogin.body.error).toContain('Invalid username or password');

        const noToken = await request(this.port, '/auth/verify');
        expect(noToken.status).toBe(401);
        expect(noToken.body.valid).toBe(false);
    }

    @Test('refreshes a local refresh token through the auth service')
    async refreshLocalToken() {
        await register(this.port, 'dave');
        const loginResult = await login(this.port, 'dave');
        const refreshed = await postJson(this.port, '/auth/refresh', {
            refreshToken: loginResult.body.refreshToken
        });
        expect(refreshed.status).toBe(200);
        expect(refreshed.body.tokens.accessToken).toBeTruthy();
        expect(refreshed.body.tokens.accessToken).not.toBe(loginResult.body.accessToken);

        const verified = await this.ctx.get(OIDCService).verifyAccessToken(refreshed.body.tokens.accessToken);
        expect(verified?.user.username).toBe('dave');
    }
}
