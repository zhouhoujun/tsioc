import expect = require('expect');
import { SwaggerService } from '../src';
import { InjectFlags, Invocation } from '@tsdi/ioc';

describe('SwaggerService coverage', () => {
    let service: SwaggerService;

    beforeEach(() => {
        service = new SwaggerService();
    });

    it('builds parameter and body docs for query, path and body inputs', () => {
        const userType = class UserModel { };
        const controllerInvocation = Object.create(Invocation.prototype);
        controllerInvocation.classRef = {
            className: 'UserController',
            getClassdDefines: (filter?: any) => {
                const routeDef = { metadata: { route: '/users', description: 'user operations' } };
                const defs = [routeDef];
                return filter ? defs.filter(filter) : defs;
            },
            getMethodDefines: (propertyKey?: any, filter?: any) => {
                if (typeof propertyKey === 'function') {
                    filter = propertyKey;
                    propertyKey = undefined;
                }
                const defs = propertyKey
                    ? [
                        { propertyKey: 'getUser', metadata: { summary: 'get user summary' } },
                        { propertyKey: 'getUser', metadata: { description: 'get user description' } }
                    ]
                    : [
                        { propertyKey: 'getUser', metadata: { route: '/:id', method: 'GET' } },
                        { propertyKey: 'saveUser', metadata: { route: '/', method: 'POST' } }
                    ];
                return filter ? defs.filter(filter) : defs;
            },
            getReturnning: (propertyKey: string) => propertyKey === 'getUser' ? userType : undefined,
            getParameters: (propertyKey: string) => {
                if (propertyKey === 'getUser') {
                    return [
                        { name: 'id', scope: 'path', type: String, flags: InjectFlags.Request, description: 'user id' },
                        { name: 'keyword', scope: 'query', type: String, flags: InjectFlags.Request | InjectFlags.Optional, nullable: true, description: 'search term' }
                    ];
                }
                return [
                    { name: 'user', scope: 'body', type: userType, description: 'user payload' }
                ];
            }
        };
        const router = {
            routes: [
                {
                    path: '/users',
                    controller: controllerInvocation
                }
            ]
        } as any;
        const doc = {
            openapi: '3.0.0',
            info: { title: 'test', version: '1.0.0' },
            paths: {},
            components: { schemas: {} },
            tags: []
        } as any;
        const modelResolver = {
            hasModel: (type: any) => type === userType,
            getPropertyMeta: () => [
                { propertyKey: 'name', type: String, nullable: false },
                { propertyKey: 'age', type: Number, nullable: true }
            ]
        } as any;

        service.buildDoc(router, doc, () => modelResolver);

        const getPath = Object.keys(doc.paths).find(path => path.includes('{id}'))!;
        const postPath = Object.keys(doc.paths).find(path => path !== getPath)!;

        expect(doc.tags).toContainEqual({ name: 'UserController', description: 'user operations' });
        expect(doc.paths[getPath].get.summary).toBe('get user summary');
        expect(doc.paths[getPath].get.parameters).toEqual([
            expect.objectContaining({ name: 'id', in: 'path', required: true }),
            expect.objectContaining({ name: 'keyword', in: 'query', required: false })
        ]);
        expect(doc.paths[postPath].post.requestBody.content['application/json'].schema).toEqual({
            '$ref': '#/components/schemas/UserModel'
        });
        expect(doc.components.schemas.UserModel.properties.name.type).toBe('string');
        expect(doc.components.schemas.UserModel.properties.age.type).toBe('number');
    });

    it('creates multipart body schema and custom html snippets', () => {
        const body = service.toBodyObject(
            {
                components: { schemas: {} }
            } as any,
            [
                { name: 'file', scope: 'body', type: ArrayBuffer, description: 'upload file' } as any,
                { name: 'note', scope: 'body', type: String, required: false, nullable: true } as any
            ],
            () => undefined
        );

        expect(body.content['multipart/form-data']).toBeDefined();
        expect(body.content['multipart/form-data'].schema.required).toEqual(['file']);

        const html = service.generateHTML(
            undefined,
            {
                customCss: '.swagger-ui { color: red; }',
                customJs: '/a.js',
                customJsStr: 'window.x=1;',
                customCssUrl: '/a.css',
                customRobots: 'noindex',
                customfavIcon: '/favicon.ico',
                swaggerUrl: '/openapi.json',
                customSiteTitle: 'Swagger Test',
                swaggerOptions: {
                    docExpansion: 'list'
                } as any
            },
            undefined,
            undefined,
            undefined,
            undefined,
            'ignored title'
        );

        expect(html).toContain('Swagger Test');
        expect(html).toContain("content=\"noindex\"");
        expect(html).toContain("<script src='/a.js'></script>");
        expect(html).toContain("<script>window.x=1;</script>");
        expect(html).toContain("<link href='/a.css' rel='stylesheet'>");
        expect((service as any).swaggerInit).toContain('"swaggerUrl": "/openapi.json"');
        expect((service as any).swaggerInit).toContain('"docExpansion": "list"');
    });
});
