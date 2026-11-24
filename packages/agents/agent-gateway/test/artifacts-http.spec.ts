import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ArtifactHandler } from '../src/api/ArtifactHandler';

function mockResponse() {
    const response: any = {
        status: 0,
        headers: {} as Record<string, string>,
        body: '',
        writeHead(status: number, headers?: Record<string, string>) {
            response.status = status;
            response.headers = headers ?? {};
            return response;
        },
        end(body?: any) { response.body = body === undefined ? '' : String(body); return response; }
    };
    return response;
}

function mockRequest(principalId = 'local-system'): any {
    return { headers: {}, auth: { principalId } };
}

@Suite('artifact HTTP serving')
export class ArtifactHttpTest {
    @Test('serves an artifact file with sandboxed content headers')
    async servesFile() {
        const runtime = {
            async readArtifact(sessionId: string, id: string, path: string) {
                expect(sessionId).toEqual('s1');
                expect(id).toEqual('art-1');
                expect(path).toEqual('index.html');
                return { manifest: { mime: 'text/html' }, path: 'index.html', content: '<h1>hi</h1>' };
            }
        } as any;
        const handler = new ArtifactHandler(runtime, null);
        const route = handler.getRoutes()[0];
        const res = mockResponse();
        await route.handler(mockRequest(), res, { sessionId: 's1', id: 'art-1', path: 'index.html' });
        expect(res.status).toEqual(200);
        expect(res.headers['Content-Type']).toContain('text/html');
        expect(res.headers['Content-Security-Policy']).toContain('sandbox');
        expect(res.headers['X-Content-Type-Options']).toEqual('nosniff');
        expect(res.body).toEqual('<h1>hi</h1>');
    }

    @Test('unknown artifacts return 404 instead of leaking files')
    async missingArtifact() {
        const handler = new ArtifactHandler({ readArtifact: async () => undefined } as any, null);
        const route = handler.getRoutes()[0];
        const res = mockResponse();
        await route.handler(mockRequest(), res, { sessionId: 's1', id: 'nope', path: 'index.html' });
        expect(res.status).toEqual(404);
    }

    @Test('foreign principals are rejected by the session owner store')
    async forbidden() {
        const owners = { isAuthorized: async () => false } as any;
        const handler = new ArtifactHandler({ readArtifact: async () => ({ content: 'x' }) } as any, owners);
        const route = handler.getRoutes()[0];
        const res = mockResponse();
        await route.handler(mockRequest(), res, { sessionId: 's1', id: 'art-1', path: 'index.html' });
        expect(res.status).toEqual(403);
    }
}
