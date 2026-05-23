import { getClassRef } from '@tsdi/ioc';
import { Authorization, AuthorizationAspect, AuthorizationPointcut } from '../src';
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
});
