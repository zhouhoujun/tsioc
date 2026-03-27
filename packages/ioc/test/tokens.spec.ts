import expect = require('expect');
import { InjectToken, Token, token, getToken, getTokenOf, InjectFlags, TokenOf } from '../src/tokens';

describe('Token Functions', () => {

    describe('InjectToken', () => {
        it('should create token with description', () => {
            const tk = new InjectToken('test token');
            expect(tk.toString()).toBe('Token test token');
        });

        it('should create token with providedIn', () => {
            class TestClass {}
            const tk = new InjectToken('test token', TestClass);
            expect(tk.providedIn).toBe(TestClass);
        });

        it('should create token with root providedIn', () => {
            const tk = new InjectToken('test token', 'root');
            expect(tk.providedIn).toBe('root');
        });

        it('should create token with platform providedIn', () => {
            const tk = new InjectToken('test token', 'platform');
            expect(tk.providedIn).toBe('platform');
        });

        describe('to', () => {
            it('should create aliased token', () => {
                const tk = new InjectToken('test');
                const aliased = tk.to('alias');
                expect(aliased.toString()).toBe('Token test_alias');
            });

            it('should return same token for empty alias', () => {
                const tk = new InjectToken('test');
                const aliased = tk.to('');
                expect(aliased).toBe(tk);
            });
        });
    });

    describe('token factory', () => {
        it('should create InjectToken', () => {
            const tk = token('test description');
            expect(tk).toBeInstanceOf(InjectToken);
            expect(tk.toString()).toBe('Token test description');
        });

        it('should create token with providedIn', () => {
            class TestClass {}
            const tk = token('test', TestClass);
            expect(tk.providedIn).toBe(TestClass);
        });
    });

    describe('getToken', () => {
        it('should return same token without alias', () => {
            const tk = token('test');
            expect(getToken(tk)).toBe(tk);
        });

        it('should create aliased token for string token', () => {
            const result = getToken('myToken', 'alias');
            expect(result.toString()).toContain('myToken_alias');
        });

        it('should create aliased token for InjectToken', () => {
            const tk = new InjectToken('test');
            const aliased = getToken(tk, 'alias');
            expect(aliased.toString()).toBe('Token test_alias');
        });

        it('should cache tokens with same key', () => {
            const first = getToken('sameKey', 'alias');
            const second = getToken('sameKey', 'alias');
            expect(first).toBe(second);
        });
    });

    describe('getTokenOf', () => {
        it('should create token with type and alias', () => {
            class TestClass {}
            const tk = getTokenOf(TestClass, 'myAlias');
            expect(tk.toString()).toContain('TestClass');
            expect(tk.toString()).toContain('myAlias');
        });

        it('should create token with type, alias and propertyKey', () => {
            class TestClass {}
            const tk = getTokenOf(TestClass, 'myAlias', 'myProp');
            expect(tk.toString()).toContain('myProp_myAlias');
        });
    });

    describe('InjectFlags', () => {
        it('should have Default flag', () => {
            expect(InjectFlags.Default).toBe(0b0000);
        });

        it('should have Host flag', () => {
            expect(InjectFlags.Host).toBe(0b0001);
        });

        it('should have Self flag', () => {
            expect(InjectFlags.Self).toBe(0b0010);
        });

        it('should have SkipSelf flag', () => {
            expect(InjectFlags.SkipSelf).toBe(0b0100);
        });

        it('should have Optional flag', () => {
            expect(InjectFlags.Optional).toBe(0b1000);
        });

        it('should have Resolve flag', () => {
            expect(InjectFlags.Resolve).toBe(0b1000000);
        });

        it('should have Request flag', () => {
            expect(InjectFlags.Request).toBe(0b10000000);
        });

        it('should support bitwise operations', () => {
            const flags = InjectFlags.Self | InjectFlags.Optional;
            expect(flags & InjectFlags.Self).toBeTruthy();
            expect(flags & InjectFlags.Optional).toBeTruthy();
            expect(flags & InjectFlags.Host).toBeFalsy();
        });
    });

    describe('TokenOf type', () => {
        it('should accept Token types', () => {
            const stringToken: TokenOf<string> = 'myStringToken';
            const injectToken: TokenOf<number> = new InjectToken('number');
            
            class MyClass {}
            const typeToken: TokenOf<MyClass> = MyClass;
            
            expect(stringToken).toBe('myStringToken');
            expect(injectToken).toBeInstanceOf(InjectToken);
        });
    });
});