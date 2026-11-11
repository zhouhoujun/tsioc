import { Aspect, Before, AfterReturning, Pointcut, JoinPoint } from '@tsdi/aop';

@Aspect({
    within: Object,
    singleton: true
})
export class SampleAspect {
    @Pointcut('execution(*.run(..))')
    pointcut() {
        return undefined;
    }

    @Before('execution(*.run(..))')
    beforeRun(joinPoint: JoinPoint) {
        return joinPoint;
    }

    @AfterReturning('execution(*.run(..))')
    afterRun(joinPoint: JoinPoint) {
        return joinPoint;
    }
}
