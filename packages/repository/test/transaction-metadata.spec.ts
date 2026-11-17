import { getClassRef } from '@tsdi/ioc';
import { Transactional, TransactionResolver } from '../src';
import expect = require('expect');

class Service {

    @Transactional()
    required(): void { }

    @Transactional({ propagation: 'REQUIRES_NEW', connection: 'secondary' } as any)
    nested(): void { }

    plain(): void { }
}

const typeRef = getClassRef(Service);

describe('@Transactional metadata', () => {

    it('defaults the propagation to REQUIRED', () => {
        const define = typeRef.getDefines(Transactional as any)
            .find(item => item.propertyKey === 'required');

        expect(define).toBeDefined();
        expect(define!.metadata.propagation).toBe('REQUIRED');
    });

    it('keeps explicit propagation and connection settings', () => {
        const define = typeRef.getDefines(Transactional as any)
            .find(item => item.propertyKey === 'nested');

        expect(define).toBeDefined();
        expect(define!.metadata.propagation).toBe('REQUIRES_NEW');
        expect(define!.metadata.connection).toBe('secondary');
    });

    it('only annotates decorated methods', () => {
        const defines = typeRef.getDefines(Transactional as any);

        expect(defines.map(item => item.propertyKey).sort()).toEqual(['nested', 'required']);
    });

    it('registers the transaction resolver on the method options', () => {
        const options = (typeRef as any).getMethodOptions('required');

        expect(options).toBeDefined();
        expect(options.resolvers).toContain(TransactionResolver);
    });

    it('leaves undecorated methods without method options', () => {
        expect((typeRef as any).getMethodOptions('plain')).toBeUndefined();
    });

});
