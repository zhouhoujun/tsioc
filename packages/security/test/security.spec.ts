import { getClassRef } from '@tsdi/ioc';
import { Authorization, AuthorizationAspect, AuthorizationPointcut, BasicAuthModule, JWTModule, OAuth2Module, OAuthModule, OIDCModule, SecurityModule, provideBasicAuth, provideJWT, provideOAuth2, provideOAuth, provideOIDC, provideSecurity } from '../src';
import { JWTService } from '../src/jwt/jwt.service';
import expect = require('expect');

describe('security metadata and jwt', () => {
    class GuardStub {}
    class PipeStub {}

    @Authorization('admin')
    class AdminController {
        @Authorization({ role: 'writer', guards: [GuardStub as any], pipes: [PipeStub as any] })
        save() {
            return true;
        }
    }

    const typeRef = getClassRef(AdminController);

    it('stores class authorization role', () => {
        const define = typeRef.getDefines(Authorization as any)[0];
        expect(define.metadata.role).toBe('admin');
    });

    it('stores method authorization metadata object', () => {
        const define = typeRef.getDefines(Authorization as any).find((item: any) => item.propertyKey === 'save');
        expect(define).toBeDefined();
        expect(define!.metadata.role).toBe('writer');
        expect(define!.metadata.guards).toEqual([GuardStub]);
        expect(define!.metadata.pipes).toEqual([PipeStub]);
    });

    it('exports authorization aspect and pointcut', () => {
        expect(typeof AuthorizationAspect).toBe('function');
        expect(AuthorizationPointcut).toContain('AuthorizationAspect.authProcess');
    });

    it('signs and verifies jwt payload', async () => {
        const service = new JWTService();
        const token = await service.sign({ sub: 'u-1', role: 'admin' }, { privateKey: 'secret-key' as any });
        const decoded = await service.verify(token, { publicKey: 'secret-key' as any });
        expect(decoded.sub).toBe('u-1');
        expect(decoded.role).toBe('admin');
    });

    it('rejects invalid jwt token', async () => {
        const service = new JWTService();
        await expect(service.verify('not-a-jwt', { publicKey: 'secret-key' as any })).rejects.toThrow(/JWT verification failed|Invalid JWT/);
    });

    it('security provide helpers return providers and module helpers return module metadata', () => {
        const jwtProviders = provideJWT({ secretOrPrivateKey: 'secret-key' as any } as any);
        expect(Array.isArray(jwtProviders)).toBe(true);
        expect(jwtProviders.length).toBeGreaterThan(0);
        expect(JWTModule.withOption({ secretOrPrivateKey: 'secret-key' as any } as any).module).toBe(JWTModule);

        const basicProviders = provideBasicAuth({ username: 'admin', password: 'secret' } as any);
        expect(Array.isArray(basicProviders)).toBe(true);
        expect(BasicAuthModule.withOption({ username: 'admin', password: 'secret' } as any).module).toBe(BasicAuthModule);

        const oauthProviders = provideOAuth({} as any);
        expect(Array.isArray(oauthProviders)).toBe(true);
        expect(OAuthModule.withOption({} as any).module).toBe(OAuthModule);

        const oauth2Providers = provideOAuth2({} as any);
        expect(Array.isArray(oauth2Providers)).toBe(true);
        expect(OAuth2Module.withOption({} as any).module).toBe(OAuth2Module);

        const oidcProviders = provideOIDC({} as any);
        expect(Array.isArray(oidcProviders)).toBe(true);
        expect(OIDCModule.withOption({} as any).module).toBe(OIDCModule);

        const securityProviders = provideSecurity({ type: 'basic' });
        expect(Array.isArray(securityProviders)).toBe(true);
        expect(SecurityModule.withOptions({ type: 'basic' }).module).toBe(SecurityModule);
    });
});
