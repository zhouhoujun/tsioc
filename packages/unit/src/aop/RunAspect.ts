import { Aspect, Around, Joinpoint, JoinpointState } from '@ts-ioc/aop';
import { SuiteRunner } from '../runner';
import { LoggerAspect } from '@ts-ioc/logs';
import { Inject, ContainerToken, IContainer } from '@ts-ioc/core';
import { TestReport } from '../reports/TestReport';
import { ITestReport, ISuiteDescribe, ICaseDescribe } from '../reports/ITestReport';

@Aspect({
    within: SuiteRunner,
    singleton: true
})
export class RunAspect extends LoggerAspect {

    constructor(@Inject(ContainerToken) container: IContainer) {
        super(container);
    }

    report: ITestReport;
    getReport(): ITestReport {
        if (!this.report) {
            this.report = this.container.get(TestReport);
        }
        return this.report;
    }

    @Around('execution(*.runSuite)')
    logBefore(joinPoint: Joinpoint) {
        let runner = joinPoint.target as SuiteRunner;
        let desc = joinPoint.args[0] as ISuiteDescribe;
        switch (joinPoint.state) {
            case JoinpointState.Before:
                desc.start = new Date().getTime();
                this.getReport().addSuite(runner.getTargetToken(), desc);
                break;
            case JoinpointState.AfterReturning:
            case JoinpointState.AfterThrowing:
                this.getReport().getSuite(runner.getTargetToken()).end = new Date().getTime();
                break;
        }
    }

    // @Around('execution(*.runBeforeEach)')
    // logBeforeEach(joinPoint: Joinpoint) {
    //     console.log(joinPoint.state, joinPoint.fullName);
    // }

    @Around('execution(*.runCase)')
    logTestCase(joinPoint: Joinpoint) {
        let desc = joinPoint.args[0] as ICaseDescribe;
        let runner = joinPoint.target as SuiteRunner;
        switch (joinPoint.state) {
            case JoinpointState.Before:
                desc.start = new Date().getTime();
                this.getReport().addCase(runner.getTargetToken(), desc);
                break;
            case JoinpointState.AfterReturning:
            case JoinpointState.AfterThrowing:
                this.getReport().getCase(runner.getTargetToken(), desc.key).end = new Date().getTime();
                break;
        }
    }

}
