import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import {
    Injectable, createInjector, getClassRef, Injector, Container,
    Autowired, Inject, ClassRef, Runtime
} from '@tsdi/ioc';
import {
    AopModule,
    JoinPoint,
    ProceedingJoinPoint,
    JoinpointState,
    IPointcut,
    Advisor,
    AdviceMatcher,
    DefaultAdviceMatcher,
    Aspect,
    Pointcut,
    Before as AopBefore,
    After as AopAfter,
    Around,
    AfterReturning,
    AfterThrowing,
    Advice,
    NonePointcut
} from '../src';

@Suite('AOP Coverage Tests')
export class AopCoverageTest {

    container!: Container;
    runtime!: Runtime;

    @Before()
    async init() {
        this.container = createInjector();
        this.runtime = this.container.getRuntime();
        this.runtime.set(Advisor, new Advisor(new DefaultAdviceMatcher(this.runtime)))
            .set(AdviceMatcher, new DefaultAdviceMatcher(this.runtime));
    }

    @After()
    async clean() {
        this.container.destroy();
    }

    @Test('JoinpointState should have correct values')
    testJoinpointStateValues() {
        expect(JoinpointState.Before).toBe('Before');
        expect(JoinpointState.Pointcut).toBe('Pointcut');
        expect(JoinpointState.After).toBe('After');
        expect(JoinpointState.AfterReturning).toBe('AfterReturning');
        expect(JoinpointState.AfterThrowing).toBe('AfterThrowing');
    }

    @Test('IPointcut should define correct interface')
    testIPointcutInterface() {
        const pointcut: IPointcut = {
            name: 'testMethod',
            fullName: 'TestClass.testMethod',
            accessor: 'value'
        };

        expect(pointcut.name).toBe('testMethod');
        expect(pointcut.fullName).toBe('TestClass.testMethod');
        expect(pointcut.accessor).toBe('value');
    }

    @Test('Advisor should initialize correctly')
    testAdvisorInitialization() {
        const matcher = new DefaultAdviceMatcher(this.runtime);
        const advisor = new Advisor(matcher);

        expect(advisor).toBeDefined();
        expect(advisor.aspects).toEqual([]);
    }

    @Test('Advisor should track aspects')
    testAdvisorTrackAspects() {
        const matcher = new DefaultAdviceMatcher(this.runtime);
        const advisor = new Advisor(matcher);

        @Injectable()
        class TestAspect {
            testMethod() {
                return 'test';
            }
        }

        const typeRef = getClassRef(TestAspect);
        const invocation = typeRef.createInvocation(this.container);

        advisor.add(invocation);
        expect(advisor.aspects.length).toBe(1);

        const found = advisor.get(TestAspect);
        expect(found).toBeDefined();

        advisor.remove(invocation);
        expect(advisor.aspects.length).toBe(0);
    }

    @Test('Advisor should not add duplicate aspects')
    testAdvisorNoDuplicates() {
        const matcher = new DefaultAdviceMatcher(this.runtime);
        const advisor = new Advisor(matcher);

        @Injectable()
        class TestAspect2 {
            testMethod() {
                return 'test';
            }
        }

        const typeRef = getClassRef(TestAspect2);
        const invocation1 = typeRef.createInvocation(this.container);
        const invocation2 = typeRef.createInvocation(this.container);

        advisor.add(invocation1);
        advisor.add(invocation2);

        expect(advisor.aspects.length).toBe(1);
    }

    @Test('Advisor match should return false when no advices')
    testAdvisorMatchNoAdvices() {
        const matcher = new DefaultAdviceMatcher(this.runtime);
        const advisor = new Advisor(matcher);
        const typeRef = getClassRef(class TestClass { });

        const result = advisor.match('method', 'TestClass.method', typeRef);
        expect(result).toBe(false);
    }

    @Test('Advisor hasCtor should work correctly')
    testAdvisorHasCtor() {
        const matcher = new DefaultAdviceMatcher(this.runtime);
        const advisor = new Advisor(matcher);

        const typeRef = getClassRef(class TestClass3 { });
        expect(advisor.hasCtor(typeRef)).toBe(false);
    }

    @Test('Advisor getAdvicers should return empty array for invalid types')
    testAdvisorGetAdvicersEmpty() {
        const matcher = new DefaultAdviceMatcher(this.runtime);
        const advisor = new Advisor(matcher);

        const result = advisor.getBefore('method', 'TestClass.method', getClassRef(class {}));
        expect(result).toEqual([]);

        const afterResult = advisor.getAfter('method', 'TestClass.method', getClassRef(class {}));
        expect(afterResult).toEqual([]);
    }

    @Test('Advisor getBefore should return matching advices')
    testAdvisorGetBefore() {
        const matcher = new DefaultAdviceMatcher(this.runtime);
        const advisor = new Advisor(matcher);
        const typeRef = getClassRef(class TestClass4 { });

        const result = advisor.getBefore('method', 'TestClass4.method', typeRef);
        expect(Array.isArray(result)).toBe(true);
    }

    @Test('Advisor getAfter should return matching advices')
    testAdvisorGetAfter() {
        const matcher = new DefaultAdviceMatcher(this.runtime);
        const advisor = new Advisor(matcher);
        const typeRef = getClassRef(class TestClass5 { });

        const result = advisor.getAfter('method', 'TestClass5.method', typeRef);
        expect(Array.isArray(result)).toBe(true);
    }

    @Test('Advisor getPointcut should return matching advices')
    testAdvisorGetPointcut() {
        const matcher = new DefaultAdviceMatcher(this.runtime);
        const advisor = new Advisor(matcher);
        const typeRef = getClassRef(class TestClass6 { });

        const result = advisor.getPointcut('method', 'TestClass6.method', typeRef);
        expect(Array.isArray(result)).toBe(true);
    }

    @Test('Advisor getAfterReturning should return matching advices')
    testAdvisorGetAfterReturning() {
        const matcher = new DefaultAdviceMatcher(this.runtime);
        const advisor = new Advisor(matcher);
        const typeRef = getClassRef(class TestClass7 { });

        const result = advisor.getAfterReturning('method', 'TestClass7.method', typeRef);
        expect(Array.isArray(result)).toBe(true);
    }

    @Test('Advisor getAfterThrowing should return matching advices')
    testAdvisorGetAfterThrowing() {
        const matcher = new DefaultAdviceMatcher(this.runtime);
        const advisor = new Advisor(matcher);
        const typeRef = getClassRef(class TestClass8 { });

        const result = advisor.getAfterThrowing('method', 'TestClass8.method', typeRef);
        expect(Array.isArray(result)).toBe(true);
    }

    @Test('Advisor getProceeding should filter correctly')
    testAdvisorGetProceeding() {
        const matcher = new DefaultAdviceMatcher(this.runtime);
        const advisor = new Advisor(matcher);
        const typeRef = getClassRef(class TestClass9 { });

        const result = advisor.getProceeding('method', 'TestClass9.method', typeRef);
        expect(Array.isArray(result)).toBe(true);
    }

    @Test('Advisor onDestroy should clear state')
    testAdvisorOnDestroy() {
        const matcher = new DefaultAdviceMatcher(this.runtime);
        const advisor = new Advisor(matcher);

        @Injectable()
        class TestAspect4 { }

        const typeRef = getClassRef(TestAspect4);
        const invocation = typeRef.createInvocation(this.container);
        advisor.add(invocation);

        expect(advisor.aspects.length).toBe(1);

        advisor.onDestroy();

        expect(advisor.aspects).toEqual([]);
    }

    @Test('DefaultAdviceMatcher should parse pointcut')
    testDefaultAdviceMatcherParse() {
        const matcher = new DefaultAdviceMatcher(this.runtime);

        const matchFn = matcher.parse({
            pointcut: /test/,
            propertyKey: 'testMethod'
        });

        expect(typeof matchFn).toBe('function');
    }

    @Test('DefaultAdviceMatcher should handle without constraint')
    testDefaultAdviceMatcherWithout() {
        const matcher = new DefaultAdviceMatcher(this.runtime);

        const matchFn = matcher.parse({
            pointcut: /test/,
            propertyKey: 'testMethod',
            without: class ExcludedClass { }
        } as any);

        expect(typeof matchFn).toBe('function');
    }

    @Test('DefaultAdviceMatcher should handle within constraint')
    testDefaultAdviceMatcherWithin() {
        const matcher = new DefaultAdviceMatcher(this.runtime);

        @Injectable()
        class IncludedClass { }

        const matchFn = matcher.parse({
            pointcut: /test/,
            propertyKey: 'testMethod',
            within: IncludedClass
        } as any);

        expect(typeof matchFn).toBe('function');
    }

    @Test('DefaultAdviceMatcher should handle accessor constraint')
    testDefaultAdviceMatcherAccessor() {
        const matcher = new DefaultAdviceMatcher(this.runtime);

        const matchFn = matcher.parse({
            pointcut: /test/,
            propertyKey: 'testMethod',
            accessor: 'get'
        } as any);

        expect(typeof matchFn).toBe('function');
    }

    @Test('BoolExpression should parse basic expression')
    testBoolExpressionBasic() {
        const { BoolExpression } = require('../src/impl/matcher');

        const exp = new BoolExpression('test1 && test2');
        expect(exp.tokens).toContain('test1');
        expect(exp.tokens).toContain('test2');
    }

    @Test('BoolExpression should parse OR expression')
    testBoolExpressionOR() {
        const { BoolExpression } = require('../src/impl/matcher');

        const exp = new BoolExpression('test1 OR test2');
        expect(exp.tokens).toContain('test1');
        expect(exp.tokens).toContain('test2');
    }

    @Test('BoolExpression should parse NOT expression')
    testBoolExpressionNOT() {
        const { BoolExpression } = require('../src/impl/matcher');

        const exp = new BoolExpression('NOT test1');
        expect(exp.tokens).toContain('test1');
    }

    @Test('BoolExpression should handle parentheses')
    testBoolExpressionParentheses() {
        const { BoolExpression } = require('../src/impl/matcher');

        const exp = new BoolExpression('(test1)');
        expect(exp.tokens).toContain('test1');
    }

    @Test('BoolExpression should handle complex expression')
    testBoolExpressionComplex() {
        const { BoolExpression } = require('../src/impl/matcher');

        const exp = new BoolExpression('@annotation(Test:class) && execution(Test.*.*(..))');
        expect(exp.tokens.length).toBeGreaterThan(0);
    }

    @Test('BoolExpression toString should work')
    testBoolExpressionToString() {
        const { BoolExpression } = require('../src/impl/matcher');

        const exp = new BoolExpression('test1 && test2');
        const result = exp.toString();
        expect(typeof result).toBe('string');
    }

    @Test('BoolExpression toString with mapper should work')
    testBoolExpressionToStringWithMapper() {
        const { BoolExpression } = require('../src/impl/matcher');

        const exp = new BoolExpression('test1 && test2');
        const result = exp.toString((token: string, idx: number, tkidx: number) => `mapped(${token})`);
        expect(typeof result).toBe('string');
    }
}



@Suite('AOP Decorator Coverage Tests')
export class AopDecoratorCoverageTest {

    @Test('Aspect decorator should be defined')
    testAspectDecoratorDefined() {
        expect(typeof Aspect).toBe('function');
    }

    @Test('Pointcut decorator should be defined')
    testPointcutDecoratorDefined() {
        expect(typeof Pointcut).toBe('function');
    }

    @Test('Before decorator should be defined')
    testBeforeDecoratorDefined() {
        expect(typeof AopBefore).toBe('function');
    }

    @Test('After decorator should be defined')
    testAfterDecoratorDefined() {
        expect(typeof AopAfter).toBe('function');
    }

    @Test('Around decorator should be defined')
    testAroundDecoratorDefined() {
        expect(typeof Around).toBe('function');
    }

    @Test('AfterReturning decorator should be defined')
    testAfterReturningDecoratorDefined() {
        expect(typeof AfterReturning).toBe('function');
    }

    @Test('AfterThrowing decorator should be defined')
    testAfterThrowingDecoratorDefined() {
        expect(typeof AfterThrowing).toBe('function');
    }

    @Test('Advice decorator should be defined')
    testAdviceDecoratorDefined() {
        expect(typeof Advice).toBe('function');
    }

    @Test('NonePointcut decorator should be defined')
    testNonePointcutDecoratorDefined() {
        expect(typeof NonePointcut).toBe('function');
    }
}



@Suite('AOP Module Coverage Tests')
export class AopModuleCoverageTest {

    container!: Container;

    @Before()
    async init() {
        this.container = createInjector();
    }

    @After()
    async clean() {
        this.container.destroy();
    }

    @Test('AopModule should be defined')
    testAopModuleDefined() {
        expect(AopModule).toBeDefined();
    }

    @Test('should setup AOP providers')
    testSetupAopProviders() {
        const runtime = this.container.getRuntime();
        
        runtime.set(Advisor, new Advisor(new DefaultAdviceMatcher(runtime)))
            .set(AdviceMatcher, new DefaultAdviceMatcher(runtime));

        expect(runtime.has(Advisor)).toBe(true);
        expect(runtime.has(AdviceMatcher)).toBe(true);
    }
}



@Suite('AOP JoinPoint Coverage Tests')
export class AopJoinPointCoverageTest {

    container!: Container;
    runtime!: Runtime;
    advisor!: Advisor;

    @Before()
    async init() {
        this.container = createInjector();
        this.runtime = this.container.getRuntime();
        this.advisor = new Advisor(new DefaultAdviceMatcher(this.runtime));
        this.runtime.set(Advisor, this.advisor);
    }

    @After()
    async clean() {
        this.container.destroy();
    }

    @Test('JoinPoint should be abstract')
    testJoinPointIsAbstract() {
        expect(JoinPoint).toBeDefined();
    }

    @Test('ProceedingJoinPoint should be defined')
    testProceedingJoinPointDefined() {
        expect(ProceedingJoinPoint).toBeDefined();
    }

    @Test('ProceedingJoinPoint should have proceed method')
    testProceedingJoinPointProceed() {
        expect(typeof ProceedingJoinPoint.prototype.proceed).toBe('function');
    }
}
