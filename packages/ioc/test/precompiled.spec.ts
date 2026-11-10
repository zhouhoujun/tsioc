import expect = require('expect');
import {
    applyPrecompiledDecorators,
    PRECOMPILED_CLASS,
    PRECOMPILED_METHOD,
    PRECOMPILED_PARAMETER,
    PRECOMPILED_PROPERTY
} from '../src';

describe('applyPrecompiledDecorators', () => {
    it('applies compact records to prototypes, statics and constructors', () => {
        const calls: any[] = [];
        const classDec = (target: any) => { calls.push(['class', target.name]); };
        const propDec = (target: any, key: any) => { calls.push(['property', key, target.constructor.name]); };
        const staticPropDec = (target: any, key: any) => { calls.push(['static-property', key, target.name]); };
        const methodDec = (target: any, key: any, descriptor: any) => {
            calls.push(['method', key, typeof descriptor?.value]);
            return descriptor;
        };
        const staticMethodDec = (target: any, key: any, descriptor: any) => {
            calls.push(['static-method', key, typeof descriptor?.value]);
            return descriptor;
        };
        const paramDec = (target: any, key: any, index: any) => {
            calls.push(['parameter', key, index, target.name || target.constructor.name]);
        };

        class Service {
            field = '';
            static statField = '';
            constructor(readonly first: string, readonly second: number) { }
            method(value: string) { return value; }
            static staticMethod(value: string) { return value; }
        }

        applyPrecompiledDecorators(Service, [
            [paramDec, PRECOMPILED_PARAMETER, undefined, 0],
            [paramDec, PRECOMPILED_PARAMETER, 'method', 0],
            [paramDec, 3 + 4, 'staticMethod', 0],
            [propDec, PRECOMPILED_PROPERTY, 'field'],
            [methodDec, PRECOMPILED_METHOD, 'method'],
            [staticPropDec, PRECOMPILED_PROPERTY + 4, 'statField'],
            [staticMethodDec, PRECOMPILED_METHOD + 4, 'staticMethod'],
            [classDec, PRECOMPILED_CLASS]
        ] as any);

        expect(calls).toEqual([
            ['parameter', undefined, 0, 'Service'],
            ['parameter', 'method', 0, 'Service'],
            ['parameter', 'staticMethod', 0, 'Service'],
            ['property', 'field', 'Service'],
            ['method', 'method', 'function'],
            ['static-property', 'statField', 'Service'],
            ['static-method', 'staticMethod', 'function'],
            ['class', 'Service']
        ]);
    });

    it('still accepts object records', () => {
        const calls: any[] = [];
        const propDec = (target: any, key: any) => calls.push([key, target.constructor.name]);
        class Service { value = 1; }
        applyPrecompiledDecorators(Service, [
            { decorator: propDec, kind: 'property', propertyKey: 'value' }
        ]);
        expect(calls).toEqual([['value', 'Service']]);
    });
});
