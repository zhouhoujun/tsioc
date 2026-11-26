import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { SelectionCore } from '../src/selection-core';

const options = [
    { id: 'a' },
    { id: 'b', disabled: true },
    { id: 'c' },
    { id: 'd', disabled: true },
    { id: 'e' }
];

@Suite('common selection core')
export class SelectionCoreTest {
    core = new SelectionCore();

    @Test('resolves preferred rows to the first enabled fallback')
    async resolves() {
        expect(this.core.resolve(options, 2)).toEqual(2);
        expect(this.core.resolve(options, 1)).toEqual(0);
        expect(this.core.resolve(options, 99)).toEqual(0);
        expect(this.core.resolve([], 0)).toEqual(-1);
        expect(this.core.resolve([{ disabled: true }], 0)).toEqual(-1);
    }

    @Test('moves over enabled rows and wraps in both directions')
    async moves() {
        expect(this.core.move(options, -1, 1)).toEqual(0);
        expect(this.core.move(options, -1, -1)).toEqual(4);
        expect(this.core.move(options, 0, 1)).toEqual(2);
        expect(this.core.move(options, 2, 1)).toEqual(4);
        expect(this.core.move(options, 4, 1)).toEqual(0);
        expect(this.core.move(options, 0, -1)).toEqual(4);
        expect(this.core.move(options, 4, -1)).toEqual(2);
        expect(this.core.move(options, 1, 1)).toEqual(0);
        expect(this.core.move(options, 0, 0)).toEqual(-1);
        expect(this.core.move([], 0, 1)).toEqual(-1);
    }

    @Test('returns the first and last enabled rows')
    async edges() {
        expect(this.core.first(options)).toEqual(0);
        expect(this.core.last(options)).toEqual(4);
        expect(this.core.first([{ disabled: true }, { id: 'x' }])).toEqual(1);
        expect(this.core.last([{ id: 'x' }, { disabled: true }])).toEqual(0);
        expect(this.core.first([{ disabled: true }])).toEqual(-1);
    }
}
