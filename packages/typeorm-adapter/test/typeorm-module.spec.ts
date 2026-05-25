import { Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { TypeOrmModule, TypeormOptions } from '../src';

@Suite('TypeOrmModule')
export class TypeOrmModuleTest {

    @Test()
    async shouldHaveWithConnection() {
        const result = TypeOrmModule.withConnection({
            name: 'test',
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'test',
            password: 'test',
            database: 'test',
        } as TypeormOptions);
        expect(result).toBeDefined();
        expect(result.module).toBe(TypeOrmModule);
        expect(result.providers).toBeDefined();
        expect(Array.isArray(result.providers)).toBe(true);
        expect(result.providers!.length).toBeGreaterThan(0);
    }

    @Test()
    async shouldHaveForRoot() {
        const result = TypeOrmModule.forRoot({
            name: 'test',
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'test',
            password: 'test',
            database: 'test',
        } as TypeormOptions);
        expect(result).toBeDefined();
        expect(result.module).toBe(TypeOrmModule);
    }

    @Test()
    async shouldHaveForFeature() {
        class TestEntity {}
        const result = TypeOrmModule.forFeature([TestEntity]);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(1);
    }

    @Test()
    async withConnectionShouldAcceptMultipleConfigs() {
        const result = TypeOrmModule.withConnection(
            { name: 'db1', type: 'postgres' } as any,
            { name: 'db2', type: 'postgres' } as any,
        );
        expect(result.providers).toBeDefined();
        expect(result.providers!.length).toBe(2);
    }

}
