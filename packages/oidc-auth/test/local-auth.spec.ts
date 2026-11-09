import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { OIDCService } from '../src/auth/OIDCService';
import { InMemoryUserStore } from '../src/auth/UserStore';
import { hashPassword, verifyPassword } from '../src/auth/password';
import { OIDCAuthGuard } from '../src/auth/OIDCAuthGuard';
import { RequestContext } from '@tsdi/common';

class JWTStub {
    private counter = 0;
    private readonly tokens = new Map<string, any>();

    async sign(payload: any, options?: any): Promise<string> {
        this.counter += 1;
        const token = `token-${this.counter}`;
        this.tokens.set(token, { ...payload, iss: options?.issuer ?? 'issuer' });
        return token;
    }

    async verify(token: string): Promise<any> {
        const payload = this.tokens.get(token);
        if (!payload) {
            throw new Error('invalid token');
        }
        return { ...payload };
    }
}

function createService(store = new InMemoryUserStore()): OIDCService {
    return new OIDCService(
        { buildAuthorizationUrl: () => 'https://issuer.example/auth', exchangeAuthorizationCode: async () => ({}) } as any,
        { validateIDToken: async () => ({}), getUserInfo: async () => ({}) } as any,
        new JWTStub() as any,
        store,
        {
            issuer: 'https://issuer.example',
            jwt: { secret: 'test-secret', issuer: 'test-issuer' },
            allowRegistration: true
        }
    );
}

async function seedUser(service: OIDCService, username = 'alice', password = 'secret-pass') {
    await service.createLocalUser({ username, password, email: `${username}@example.com`, roles: ['user'] });
}

@Suite('Local auth service')
export class LocalAuthServiceTest {
    @Test('hashes passwords with a random salt and verifies them')
    async passwordHashing() {
        const first = await hashPassword('secret-pass');
        const second = await hashPassword('secret-pass');
        expect(first).not.toBe(second);
        expect(first.startsWith('scrypt$')).toBe(true);
        expect(await verifyPassword('secret-pass', first)).toBe(true);
        expect(await verifyPassword('wrong-pass', first)).toBe(false);
        expect(await verifyPassword('secret-pass', null)).toBe(false);
    }

    @Test('registers a user and rejects duplicate usernames')
    async register() {
        const service = createService();
        const result = await service.register({ username: 'Alice', password: 'secret-pass', email: 'alice@example.com' });
        expect((result.user as any).username).toBe('alice');
        expect((result.user as any).email).toBe('alice@example.com');
        expect(result.tokens.accessToken).toBeTruthy();
        expect(result.tokens.refreshToken).toBeTruthy();
        expect(result.tokens.sessionToken).toBeTruthy();

        await expect(service.register({ username: 'alice', password: 'secret-pass' })).rejects.toThrow('already exists');
    }

    @Test('rejects weak passwords and disabled registration')
    async registerValidation() {
        const service = createService();
        await expect(service.register({ username: 'alice', password: 'short' })).rejects.toThrow('at least 8');
        const disabled = new OIDCService(
            {} as any,
            {} as any,
            new JWTStub() as any,
            new InMemoryUserStore(),
            { issuer: 'https://issuer.example', allowRegistration: false }
        );
        await expect(disabled.register({ username: 'alice', password: 'secret-pass' })).rejects.toThrow('disabled');
    }

    @Test('logs in with a correct password and rejects invalid credentials')
    async login() {
        const service = createService();
        await seedUser(service);
        const result = await service.login({ username: 'ALICE', password: 'secret-pass' });
        expect((result.user as any).username).toBe('alice');
        expect(result.tokens.accessToken).toBeTruthy();

        await expect(service.login({ username: 'alice', password: 'wrong' })).rejects.toThrow('Invalid username or password');
        await expect(service.login({ username: 'unknown', password: 'secret-pass' })).rejects.toThrow('Invalid username or password');
    }

    @Test('verifies access tokens and introspects them')
    async verifyAndIntrospect() {
        const service = createService();
        await seedUser(service);
        const login = await service.login({ username: 'alice', password: 'secret-pass' });
        const accessToken = login.tokens.accessToken;

        const verified = await service.verifyAccessToken(accessToken);
        expect(verified).toBeTruthy();
        expect(verified!.user.username).toBe('alice');
        expect(verified!.claims.typ).toBe('access');

        const introspection = await service.introspect(accessToken);
        expect(introspection.active).toBe(true);
        expect(introspection.username).toBe('alice');

        expect(await service.verifyAccessToken('not-a-token')).toBeNull();
        expect((await service.introspect('not-a-token')).active).toBe(false);
    }

    @Test('does not accept session or refresh tokens as access tokens')
    async tokenTypesAreSeparated() {
        const service = createService();
        await seedUser(service);
        const login = await service.login({ username: 'alice', password: 'secret-pass' });
        expect(await service.verifySessionToken(login.tokens.sessionToken!)).toBeTruthy();
        expect(await service.verifyAccessToken(login.tokens.sessionToken!)).toBeNull();
        expect(await service.verifyAccessToken(login.tokens.refreshToken!)).toBeNull();
        expect((await service.verifyToken(login.tokens.sessionToken!))?.tokenType).toBe('session');
    }

    @Test('refreshes local tokens and rejects a missing refresh token')
    async refresh() {
        const service = createService();
        await seedUser(service);
        const login = await service.login({ username: 'alice', password: 'secret-pass' });
        const refreshed = await service.refreshTokens(login.tokens.refreshToken!);
        expect(refreshed.accessToken).toBeTruthy();
        expect(refreshed.accessToken).not.toBe(login.tokens.accessToken);
        await expect(service.refreshTokens('')).rejects.toThrow('Refresh token is required');
    }

    @Test('guard extracts a bearer token and attaches the user to the context')
    async guard() {
        const service = createService();
        await seedUser(service);
        const login = await service.login({ username: 'alice', password: 'secret-pass' });
        const guard = new OIDCAuthGuard(service);
        const store = new Map<any, any>();
        const context = {
            get: (token: any) => store.get(token),
            set: (token: any, value: any) => { store.set(token, value); return context; }
        } as unknown as RequestContext;

        const accepted = await guard.canHandle({
            headers: { authorization: `Bearer ${login.tokens.accessToken}` }
        }, context);
        expect(accepted).toBe(true);

        const rejected = await guard.canHandle({ headers: {} }, context);
        expect(rejected).toBe(false);
    }
}

