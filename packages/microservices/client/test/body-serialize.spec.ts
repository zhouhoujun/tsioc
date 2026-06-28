import expect = require('expect');
import { BodySerializeStrategy } from '../src/strategies/BodySerializeStrategy';
import { createInjector } from '@tsdi/ioc';
import { createRequestContext } from '@tsdi/common';

class TestBodySerializeStrategy extends BodySerializeStrategy {
    serialize(body: any, context: any): any {
        if (typeof body === 'object') {
            return JSON.stringify(body);
        }
        return String(body);
    }

    detectContentType(body: any): string | null {
        if (typeof body === 'object') {
            return 'application/json';
        }
        return 'text/plain';
    }

    canHandle(body: any): boolean {
        return body !== null && body !== undefined;
    }
}

describe('BodySerializeStrategy', () => {
    it('should be abstract', () => {
        expect(typeof BodySerializeStrategy).toBe('function');
    });

    it('concrete implementation serializes objects to JSON', () => {
        const strategy = new TestBodySerializeStrategy();
        const ctx = createRequestContext(createInjector([]));
        const result = strategy.serialize({ hello: 'world' }, ctx);
        expect(result).toBe('{"hello":"world"}');
    });

    it('concrete implementation serializes strings', () => {
        const strategy = new TestBodySerializeStrategy();
        const ctx = createRequestContext(createInjector([]));
        const result = strategy.serialize('hello', ctx);
        expect(result).toBe('hello');
    });

    it('detects content type for objects', () => {
        const strategy = new TestBodySerializeStrategy();
        expect(strategy.detectContentType({})).toBe('application/json');
    });

    it('detects content type for strings', () => {
        const strategy = new TestBodySerializeStrategy();
        expect(strategy.detectContentType('text')).toBe('text/plain');
    });

    it('canHandle returns true for non-null values', () => {
        const strategy = new TestBodySerializeStrategy();
        expect(strategy.canHandle('test')).toBe(true);
        expect(strategy.canHandle(0)).toBe(true);
        expect(strategy.canHandle(false)).toBe(true);
        expect(strategy.canHandle(null)).toBe(false);
        expect(strategy.canHandle(undefined)).toBe(false);
    });
});
