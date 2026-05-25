import { Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { TypeormAdapter } from '../src/TypeormAdapter';
import { TypeOrmModule } from '../src/typeorm.module';
import { TypeormTransactionManager, TypeormTransactionStatus } from '../src/transaction';
import { TypeormRepositoryArgumentResolver, TypeormTransactionResolver } from '../src/resolvers';

@Suite('TypeormAdapter')
export class TypeormAdapterTest {

    @Test()
    async shouldExportTypeormAdapter() {
        expect(TypeormAdapter).toBeDefined();
        expect(typeof TypeormAdapter).toBe('function');
    }

    @Test()
    async shouldExportTypeOrmModule() {
        expect(TypeOrmModule).toBeDefined();
        expect(typeof TypeOrmModule).toBe('function');
    }

    @Test()
    async shouldExportTransactionManager() {
        expect(TypeormTransactionManager).toBeDefined();
        expect(typeof TypeormTransactionManager).toBe('function');
    }

    @Test()
    async shouldExportTransactionStatus() {
        expect(TypeormTransactionStatus).toBeDefined();
        expect(typeof TypeormTransactionStatus).toBe('function');
    }

    @Test()
    async shouldExportRepositoryResolver() {
        expect(TypeormRepositoryArgumentResolver).toBeDefined();
        expect(typeof TypeormRepositoryArgumentResolver).toBe('function');
    }

    @Test()
    async shouldExportTransactionResolver() {
        expect(TypeormTransactionResolver).toBeDefined();
        expect(typeof TypeormTransactionResolver).toBe('function');
    }

    @Test()
    async shouldExportProvideTypeOrm() {
        const { provideTypeOrm } = require('../src/typeorm.module');
        expect(provideTypeOrm).toBeDefined();
        expect(typeof provideTypeOrm).toBe('function');
        const providers = provideTypeOrm({
            name: 'test',
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'test',
            password: 'test',
            database: 'test',
        } as any);
        expect(Array.isArray(providers)).toBe(true);
        expect(providers.length).toBeGreaterThan(0);
    }
}
