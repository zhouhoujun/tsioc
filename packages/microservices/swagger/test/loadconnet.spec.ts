import { Suite, Test } from '@tsdi/unit';
import { SwaggerModule } from '../src';
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
