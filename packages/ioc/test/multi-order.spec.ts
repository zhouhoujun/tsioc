import expect = require('expect');
import { createInjector, token } from '../src';

const ORDERED = token<string[]>('ORDERED');

describe('multi provider order', () => {

    it('resolves multi providers by ascending multiOrder', () => {
        const inj = createInjector([
            { provide: ORDERED, useValue: 'no-order', multi: true },
            { provide: ORDERED, useValue: 'inner', multi: true, multiOrder: 1000 },
            { provide: ORDERED, useValue: 'outer', multi: true, multiOrder: -1000 },
            { provide: ORDERED, useValue: 'middle', multi: true, multiOrder: 0 },
            { provide: ORDERED, useValue: 'outer-b', multi: true, multiOrder: -1000 }
        ]);

        expect(inj.get(ORDERED)).toEqual(['outer', 'outer-b', 'middle', 'inner', 'no-order']);
    });

    it('keeps registration order for equal multiOrder values', () => {
        const second = token<string[]>('ORDERED_EQUAL');
        const inj = createInjector([
            { provide: second, useValue: 'first', multi: true, multiOrder: 5 },
            { provide: second, useValue: 'second', multi: true, multiOrder: 5 },
            { provide: second, useValue: 'third', multi: true, multiOrder: 5 }
        ]);

        expect(inj.get(second)).toEqual(['first', 'second', 'third']);
    });

    it('places providers without multiOrder last in registration order', () => {
        const third = token<string[]>('ORDERED_DEFAULT');
        const inj = createInjector([
            { provide: third, useValue: 'plain-a', multi: true },
            { provide: third, useValue: 'ordered', multi: true, multiOrder: 10 },
            { provide: third, useValue: 'plain-b', multi: true }
        ]);

        expect(inj.get(third)).toEqual(['ordered', 'plain-a', 'plain-b']);
    });

    it('treats a non-finite multiOrder as no order', () => {
        const fourth = token<string[]>('ORDERED_NAN');
        const inj = createInjector([
            { provide: fourth, useValue: 'ordered', multi: true, multiOrder: 1 },
            { provide: fourth, useValue: 'nan', multi: true, multiOrder: Number.NaN }
        ]);

        expect(inj.get(fourth)).toEqual(['ordered', 'nan']);
    });
});
