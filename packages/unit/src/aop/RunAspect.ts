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
        console.log(joinPoint.state, joinPoint.fullName);
        console.log(joinPoint.args);
    }

    @Around('execution(*.runBeforeEach)')
    logBeforeEach(joinPoint: Joinpoint) {
        console.log(joinPoint.state, joinPoint.fullName);
    }

    @Around('execution(*.runCase)')
    logTestCase(joinPoint: Joinpoint) {
        console.log(joinPoint.state, joinPoint.fullName);
        console.log(joinPoint.args[0].title);
    }

}
