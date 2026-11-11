import expect = require('expect');
import * as ts from 'typescript';
import { createAotTransformer } from '../src/activities/AotTransformer';

function transform(source: string): string {
    const file = ts.createSourceFile('fixture.ts', source, ts.ScriptTarget.ES2020, true);
    const result = ts.transform(file, [createAotTransformer()]);
    const printed = ts.createPrinter().printFile(result.transformed[0]);
    result.dispose();
    return printed;
}

describe('decorator precompile transformer', () => {
    it('replaces class/member/parameter decorators with one metadata call', () => {
        const output = transform(`
import { Injectable, Inject, Autowired } from '@tsdi/ioc';
@Injectable()
class Service {
    @Autowired()
    value: string;
    constructor(@Inject('token') value: string) {}
}
`);
        expect(output).not.toContain('@Injectable');
        expect(output).not.toContain('@Autowired');
        expect(output).not.toContain('@Inject');
        expect(output).toContain('__aotDeco(');
        // Compact tuples: [decorator, kindIndex, propertyKey?, parameterIndex?].
        expect(output).toContain('[Injectable(), 0]');
        expect(output).toContain('Autowired(), 1, "value"');
        expect(output).toContain("Inject('token'), 3, undefined, 0");
        expect(output).toContain('Reflect.metadata("design:paramtypes"');
        expect(output).toContain('Reflect.metadata("design:type"');
    });

    it('targets the constructor for static members', () => {
        const output = transform(`
import { Injectable, Autowired } from '@tsdi/ioc';
@Injectable()
class Service {
    @Autowired() static shared: string;
    @Autowired() static create(): void {}
    @Autowired() instance: string;
}
`);
        expect(output).toContain('Autowired(), 5, "shared"');
        expect(output).toContain('Autowired(), 6, "create"');
        expect(output).toContain('Autowired(), 1, "instance"');
        expect(output).toContain('Reflect.metadata("design:type", String)(Service, "shared")');
        expect(output).toContain('Reflect.metadata("design:type", String)(Service.prototype, "instance")');
        expect(output).toContain('Reflect.metadata("design:returntype", void 0)(Service, "create")');
    });

    it('applies parameter decorators from the last parameter backwards', () => {
        const output = transform(`
class Service {
    method(@Param('p1') first: string, @Param('p2') second: number) {}
}
`);
        const order = [...output.matchAll(/Param\('(p[0-9]+)'\), 3, \"method\", ([0-9]+)/g)]
            .map(match => [match[1], Number(match[2])]);
        expect(order).toEqual([['p2', 1], ['p1', 0]]);
    });

    it('maps AfterReturning/AfterThrowing arguments to advice metadata', () => {
        const output = transform(`
import { Aspect, AfterReturning, AfterThrowing } from '@tsdi/aop';
@Aspect()
class LogAspect {
    @AfterReturning('execution(*.run(..))', 'result')
    afterReturning() {}
    @AfterThrowing('execution(*.run(..))', 'error', 'ErrorDeco')
    afterThrowing() {}
}
`);
        expect(output).toContain("returning: 'result'");
        expect(output).toContain("throwing: 'error'");
        expect(output).toContain("annotationName: 'ErrorDeco'");
    });

    it('lowers NonePointcut to a precompiled class flag', () => {
        const output = transform(`
import { NonePointcut } from '@tsdi/aop';
@NonePointcut()
class ReadOnly {}
`);
        expect(output).not.toContain('@NonePointcut');
        expect(output).toContain('__aotNoPointcut(ReadOnly)');
        expect(output).toContain('registerPrecompiledNoPointcut as __aotNoPointcut');
    });

    it('lowers AOP decorators to registerPrecompiledAspect', () => {
        const output = transform(`
import { Aspect, Before, JoinPoint } from '@tsdi/aop';
@Aspect({ within: Service })
class LogAspect {
    @Before('execution(*.run(..))')
    before(joinPoint: JoinPoint) {}
}
`);
        expect(output).not.toContain('@Aspect');
        expect(output).not.toContain('@Before');
        expect(output).toContain('__aotAspect');
        expect(output).toContain('adviceName: "Before"');
        expect(output).toContain('execution(*.run(..))');
        expect(output).toContain('propertyKey: "before"');
    });
});
