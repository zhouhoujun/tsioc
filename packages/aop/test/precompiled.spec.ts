import { createInjector, getClassRef, Inject, Injectable, InjectUtil, noPointcut } from '@tsdi/ioc';
import expect = require('expect');
import { AopModule, clearPrecompiledAspects, getPrecompiledAspects, JoinPoint, registerPrecompiledAspect, registerPrecompiledNoPointcut } from '../src';

describe('precompiled AOP metadata', () => {
    afterEach(() => {
        clearPrecompiledAspects();
    });

    it('marks classes as no-pointcut without the decorator', () => {
        class ReadOnly {}
        registerPrecompiledNoPointcut(ReadOnly);
        expect((ReadOnly as any)[noPointcut]).toBe(true);
    });

    it('ignores imported aspects that are not part of the application graph', () => {
        let calls = 0;

        @Injectable()
        class LocalService {
            execute() {
                return 'ok';
            }
        }

        class ImportedAspect {
            before() {
                calls++;
            }
        }

        registerPrecompiledAspect(ImportedAspect, {
            within: [LocalService],
            advices: [{
                propertyKey: 'before',
                adviceName: 'Before',
                pointcut: 'execution(LocalService.execute)'
            }]
        });

        const container = createInjector();
        InjectUtil.use(container, AopModule, LocalService);
        expect((container.get(LocalService) as LocalService).execute()).toBe('ok');
        expect(calls).toBe(0);
    });

    it('registers aspects and advices without AOP decorators', () => {
        let calls = 0;

        @Injectable()
        class PrecompiledService {
            execute() {
                return 42;
            }
        }

        class PrecompiledAspect {
            before(joinPoint: JoinPoint) {
                calls++;
                expect(joinPoint.fullName).toContain('execute');
            }
        }

        registerPrecompiledAspect(PrecompiledAspect, {
            static: true,
            within: ['PrecompiledService'],
            advices: [{
                propertyKey: 'before',
                adviceName: 'Before',
                pointcut: 'execution(PrecompiledService.execute)',
                params: [{ type: JoinPoint }]
            }]
        });

        const annotation: any = getClassRef(PrecompiledAspect).getAnnotation();
        expect(annotation.aspect).toBeTruthy();
        expect(annotation.aspect.static).toBe(true);
        expect(annotation.aspect.within).toBe(PrecompiledService);
        expect(annotation.advices[0].adviceName).toBe('Before');
        expect(getPrecompiledAspects().some(entry => entry.target === PrecompiledAspect)).toBe(true);

        const container = createInjector();
        InjectUtil.use(container, AopModule, PrecompiledAspect, PrecompiledService);
        const service = container.get(PrecompiledService) as PrecompiledService;
        expect(service.execute()).toBe(42);
        expect(calls).toBeGreaterThan(0);
    });
});
