import { Aspect, Around, Joinpoint } from '@ts-ioc/aop';
import { SuiteRunner } from '../runner';
import { LoggerAspect } from '@ts-ioc/logs';
import { Inject, ContainerToken, IContainer } from '@ts-ioc/core';

@Aspect({
    within: SuiteRunner,
    singleton: true
})
export class RunAspect  extends LoggerAspect {

    constructor(@Inject(ContainerToken) container: IContainer) {
        super(container);
    }

    @Around('execution(*.runBefore)')
    logBefore(joinPoint: Joinpoint) {
        console.log(joinPoint.state, joinPoint.targetType);
    }

    @Around('execution(*.runBeforeEach)')
    logBeforeEach(joinPoint: Joinpoint) {
        console.log(joinPoint.state, joinPoint.targetType);
    }

    @Around('execution(*.runCase)')
    logTestCase(joinPoint: Joinpoint) {
        console.log(joinPoint.state, joinPoint.targetType, joinPoint.args);
    }

}
