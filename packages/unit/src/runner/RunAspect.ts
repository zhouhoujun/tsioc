import { Aspect, Around, Joinpoint } from '@ts-ioc/aop';
import { SuiteRunner } from './SuiteRunner';

@Aspect({
    within: SuiteRunner
})
export class RunAspect {

    @Around('execution(*.runBefore)')
    logBefore(joinPoint: Joinpoint) {

    }

    @Around('execution(*.runCase)')
    logTestCase(joinPoint: Joinpoint) {

    }

}
