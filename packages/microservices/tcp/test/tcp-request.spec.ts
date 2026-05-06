import { TcpRequest } from '../src/client/request';
import expect = require('expect');

describe('TcpRequest', () => {

    describe('constructor', () => {
        it('should create a TcpRequest with url and pattern', () => {
            const req = new TcpRequest('/api/users', { cmd: 'users' }, {
                method: 'GET',
                headers: { 'accept': 'application/json' }
            });

            expect(req).toBeInstanceOf(TcpRequest);
            expect(req.url).toBe('/api/users');
            expect(req.pattern).toEqual({ cmd: 'users' });
            expect(req.method).toBe('GET');
        });

        it('should create a TcpRequest with null pattern', () => {
            const req = new TcpRequest('/api/hello', null, {
                method: 'POST'
            });

            expect(req.url).toBe('/api/hello');
            expect(req.pattern).toBeNull();
            expect(req.method).toBe('POST');
        });

        it('should use default method when not specified', () => {
            const req = new TcpRequest('/api/items', { cmd: 'list' }, {
                headers: {}
            }, 'GET');

            expect(req.method).toBe('GET');
        });

        it('should handle empty default method', () => {
            const req = new TcpRequest('/api/items', null, {}, '');

            expect(req.method).toBe('');
        });

        it('should prefer init method over default method', () => {
            const req = new TcpRequest('/api/items', { cmd: 'create' }, {
                method: 'POST',
                headers: {}
            }, 'GET');

            expect(req.method).toBe('POST');
        });

        it('should create TcpRequest with undefined pattern', () => {
            const req = new TcpRequest('/api/test', undefined, {});

            expect(req.url).toBe('/api/test');
            expect(req.pattern).toBeUndefined();
        });
    });

    describe('clone', () => {
        it('should clone with the same url by default', () => {
            const original = new TcpRequest('/api/users', { cmd: 'users' }, {
                method: 'GET',
                headers: { 'accept': 'application/json' }
            });

            const cloned = original.clone();

            expect(cloned).toBeInstanceOf(TcpRequest);
            expect(cloned.url).toBe('/api/users');
            expect(cloned.method).toBe('GET');
            expect(cloned).not.toBe(original);
        });

        it('should clone with updated url', () => {
            const original = new TcpRequest('/api/users', { cmd: 'users' }, {
                method: 'GET'
            });

            const cloned = original.clone({ url: '/api/users/123' });

            expect(cloned.url).toBe('/api/users/123');
            expect(cloned.method).toBe(original.method);
        });

        it('should clone with updated method', () => {
            const original = new TcpRequest('/api/users', null, {
                method: 'GET'
            });

            const cloned = original.clone({ method: 'POST' });

            expect(cloned.url).toBe('/api/users');
        });

        it('should clone with updated headers', () => {
            const original = new TcpRequest('/api/users', { cmd: 'users' }, {
                method: 'GET',
                headers: { 'accept': 'application/json' }
            });

            const cloned = original.clone({
                headers: { 'authorization': 'Bearer token' }
            });

            expect(cloned.url).toBe('/api/users');
        });

        it('should clone with updated body', () => {
            const original = new TcpRequest('/api/users', null, {
                method: 'POST',
                body: { name: 'Original' }
            });

            const cloned = original.clone({
                body: { name: 'Cloned' }
            });

            expect(cloned.url).toBe('/api/users');
        });

        it('should handle empty clone update', () => {
            const original = new TcpRequest('/api/test', null, {
                method: 'GET'
            });

            const cloned = original.clone({});

            expect(cloned.url).toBe(original.url);
            expect(cloned.method).toBe(original.method);
        });

        it('should clone with params', () => {
            const original = new TcpRequest('/api/users', null, {
                method: 'GET',
                params: { page: '1' }
            });

            const cloned = original.clone({
                params: { page: '2', sort: 'name' }
            });

            expect(cloned.url).toBe('/api/users');
        });
    });

    describe('edge cases', () => {
        it('should handle request with body and pattern', () => {
            const req = new TcpRequest('/api/bulk', { cmd: 'bulk' }, {
                method: 'POST',
                body: [{ id: 1 }, { id: 2 }]
            });

            expect(req.url).toBe('/api/bulk');
            expect(req.pattern).toEqual({ cmd: 'bulk' });
            expect(req.method).toBe('POST');
        });

        it('should handle request with only url', () => {
            const req = new TcpRequest('/health', null, { method: 'GET' });

            expect(req.url).toBe('/health');
            expect(req.method).toBe('GET');
        });

        it('should handle request with query params', () => {
            const req = new TcpRequest('/api/search', null, {
                method: 'GET',
                params: { q: 'test', page: '1', limit: '10' }
            });

            expect(req.url).toBe('/api/search');
            expect(req.method).toBe('GET');
        });
    });
});
