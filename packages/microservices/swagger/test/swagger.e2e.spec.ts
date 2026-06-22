import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { Controller, Get, provideService, useJson, useRouter } from '@tsdi/service';
import { useHttpTransport } from '@tsdi/http';
import { SwaggerModule, provideSwagger } from '../src';
import { Transport } from '@tsdi/common';
import * as http from 'node:http';
import expect = require('expect');

const PORT = 21321;

@Controller('/hello')
class HelloController {
    @Get('/')
    hello() {
        return { ok: true };
    }
}

describe('Swagger E2E', () => {
    @Module({
        imports: [LoggerModule, SwaggerModule],
        declarations: [HelloController],
        providers: [
            ...provideSwagger({
                title: 'Swagger E2E',
                description: 'swagger e2e docs',
                version: '1.0.0',
                prefix: 'api-doc',
                customSiteTitle: 'Swagger E2E',
                transport: Transport.HTTP
            }),
            provideService(
                useRouter(),
                useJson(),
                ...useHttpTransport({ listenOpts: { port: PORT, host: '127.0.0.1' }, asDefault: true })
            )
        ]
    })
    class SwaggerE2EApp { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(SwaggerE2EApp);
    });

    after(async () => {
        await ctx?.close();
    });

    function httpGet(path: string): Promise<{ status: number; body: string; contentType?: string }> {
        return new Promise((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port: PORT,
                path,
                method: 'GET'
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve({
                    status: res.statusCode ?? 0,
                    body,
                    contentType: res.headers['content-type'] as string | undefined
                }));
            });
            req.on('error', reject);
            req.end();
        });
    }

    it('serves swagger ui html page', async () => {
        const res = await httpGet('/api-doc');

        expect(res.status).toBe(200);
        expect(res.body).toContain('swagger-ui');
        expect(res.body).toContain('<div id="swagger-ui"></div>');
        expect(res.body).toContain('Swagger E2E');
        expect(res.body).toContain('<base href="/api-doc/">');
    });

    it('serves swagger static assets under the swagger prefix', async () => {
        const bundle = await httpGet('/api-doc/swagger-ui-bundle.js');
        const css = await httpGet('/api-doc/swagger-ui.css');
        const init = await httpGet('/api-doc/swagger-ui-init.js');
        const favicon = await httpGet('/api-doc/favicon-32x32.png');

        expect(bundle.status).toBe(200);
        expect(bundle.contentType).toContain('application/javascript');
        expect(bundle.body).toContain('SwaggerUIBundle');

        expect(css.status).toBe(200);
        expect(css.contentType).toContain('text/css');
        expect(css.body).toContain('.swagger-ui');

        expect(init.status).toBe(200);
        expect(init.contentType).toContain('application/javascript');
        expect(init.body).toContain('SwaggerUIBundle');

        expect(favicon.status).toBe(200);
        expect(favicon.contentType).toContain('image/png');
        expect(favicon.body.length).toBeGreaterThan(0);
    });
});
