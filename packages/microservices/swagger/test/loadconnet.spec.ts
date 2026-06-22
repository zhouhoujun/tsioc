import { Suite, Test } from '@tsdi/unit';
import { SwaggerModule, provideSwagger } from '../src';
import { createInjector } from '@tsdi/ioc';
import { defaultFormatter, Transport } from '@tsdi/common';
import { ROUTERS, OptimizedRouter } from '@tsdi/service';
import expect = require('expect');

@Suite('swagger module test')
export class SwaggerLoadTest {

    @Test()
    async swaggerModuleDefined() {
        expect(SwaggerModule).toBeDefined();
        expect(SwaggerModule.withOptions).toBeInstanceOf(Function);
    }

    @Test()
    async swaggerWithOptionsReturnsModuleWithProviders() {
        const result = SwaggerModule.withOptions({
            title: 'api test',
            version: 'v1',
            prefix: 'api-docs'
        });
        expect(result).toBeDefined();
        expect(result.module).toBe(SwaggerModule);
        expect(result.providers?.length).toBeGreaterThan(0);
    }

    @Test()
    async provideSwaggerReturnsProviders() {
        const result = provideSwagger({
            title: 'api test',
            version: 'v1',
            prefix: 'api-docs'
        });
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
    }

    @Test()
    async swaggerServiceResolvesRoutersFromParentInjector() {
        const { SwaggerService } = await import('../src');
        const root = createInjector([
            {
                provide: ROUTERS,
                useValue: new OptimizedRouter(createInjector(), defaultFormatter, '', Transport.HTTP),
                multi: true
            }
        ]);
        const child = createInjector(root);
        const service = new SwaggerService() as any;
        const router = service.resolveRouter(child);
        expect(router).toBeDefined();
        expect(router.transport).toBe(Transport.HTTP);
    }

    @Test()
    async swaggerServiceClassExists() {
        const { SwaggerService } = await import('../src');
        expect(SwaggerService).toBeDefined();
    }

    @Test()
    async swaggerConfigTypesExported() {
        const config = await import('../src/swagger.config');
        expect(config.SWAGGER_SETUP_OPTIONS).toBeDefined();
        expect(config.SWAGGER_DOCUMENT).toBeDefined();
    }

}
