import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AuthController } from '../src/controllers/AuthController';

class OIDCServiceStub {
    authenticate() {
        return {
            url: 'https://issuer.example/auth?state=s1',
            state: 's1',
            nonce: 'n1'
        };
    }

    async authenticateCallback(code: string, state: string, expectedState: string, expectedNonce: string): Promise<any> {
        return { code, state, expectedState, expectedNonce };
    }
}

function createContext() {
    const store = new Map<string, string>();
    return {
        secure: false,
        cookies: {
            set(name: string, value?: string) {
                if (typeof value === 'undefined') {
                    store.delete(name);
                    return;
                }
                store.set(name, value);
            },
            get(name: string) {
                return store.get(name);
            }
        }
    } as any;
}

@Suite('OIDC auth controller')
export class AuthControllerTest {
    @Test('stores state and nonce cookies on login')
    login() {
        const controller = new AuthController(new OIDCServiceStub() as any);
        const ctx = createContext();
        const url = controller.login(ctx);
        expect(url).toContain('state=s1');
        expect(ctx.cookies.get('oidc_state')).toBe('s1');
        expect(ctx.cookies.get('oidc_nonce')).toBe('n1');
    }

    @Test('reads and clears cookies on callback')
    async callback() {
        const controller = new AuthController(new OIDCServiceStub() as any);
        const ctx = createContext();
        ctx.cookies.set('oidc_state', 's1');
        ctx.cookies.set('oidc_nonce', 'n1');
        const result = await controller.callback(ctx, 'code-1', 'state-1');
        expect(result.code).toBe('code-1');
        expect(result.expectedState).toBe('s1');
        expect(result.expectedNonce).toBe('n1');
        expect(ctx.cookies.get('oidc_state')).toBe(undefined);
        expect(ctx.cookies.get('oidc_nonce')).toBe(undefined);
    }
}
