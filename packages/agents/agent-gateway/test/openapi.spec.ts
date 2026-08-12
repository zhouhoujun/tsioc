import { buildOpenApiDocument } from '../src/gateway/OpenApiDocument';
import expect = require('expect');
import { Test } from '@tsdi/unit';

class OpenApiDocumentSpec {
    @Test('converts registered gateway routes into OpenAPI paths')
    convertsRoutes() {
        const document = buildOpenApiDocument([
            { method: 'GET', path: '/health', auth: false, handler: () => undefined },
            { method: 'GET', path: '/api/sessions/:id', handler: () => undefined },
            { method: 'POST', path: '/rpc', handler: () => undefined }
        ]);

        expect(document.openapi).toBe('3.1.0');
        expect(document.paths['/health'].get.security).toBeUndefined();
        expect(document.paths['/api/sessions/{id}'].get.parameters[0]).toEqual({
            name: 'id', in: 'path', required: true, schema: { type: 'string' }
        });
        expect(document.paths['/rpc'].post.security).toEqual([{ bearerAuth: [] }]);
        expect(document.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
    }

    @Test('merges methods for the same normalized path')
    mergesMethods() {
        const document = buildOpenApiDocument([
            { method: 'GET', path: '/api/items/:id', handler: () => undefined },
            { method: 'DELETE', path: '/api/items/:id', handler: () => undefined }
        ]);
        expect(Object.keys(document.paths['/api/items/{id}'])).toEqual(['get', 'delete']);
    }
}
