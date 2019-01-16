import { Aspect, Around, Joinpoint, JoinpointState } from '@ts-ioc/aop';
import { SuiteRunner, OldTestRunner, ISuiteRunner } from '../runner';
import { LoggerAspect } from '@ts-ioc/logs';
import { Inject, ContainerToken, IContainer, Singleton } from '@ts-ioc/core';
import { TestReport } from '../reports/TestReport';
import { ITestReport, ISuiteDescribe, ICaseDescribe } from '../reports/ITestReport';

@Aspect({
    within: [SuiteRunner, OldTestRunner],
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
        let runner = joinPoint.target as ISuiteRunner;
        let desc = joinPoint.args[0] as ISuiteDescribe;
        switch (joinPoint.state) {
            case JoinpointState.Before:
                desc.start = new Date().getTime();
                this.getReport().addSuite(runner.getTargetToken() || desc.describe, desc);
                break;
            case JoinpointState.AfterReturning:
            case JoinpointState.AfterThrowing:
                desc.end = new Date().getTime();
                this.getReport().setSuiteCompleted(desc);
                break;
        }
    }

    @Around('execution(*.runCase)')
    logTestCase(joinPoint: Joinpoint) {
        let desc = joinPoint.args[0] as ICaseDescribe;
        let suiteDesc = joinPoint.args.length > 1 ? joinPoint.args[1] : {};
        let runner = joinPoint.target as SuiteRunner;
        switch (joinPoint.state) {
            case JoinpointState.Before:
                desc.start = new Date().getTime();
                this.getReport().addCase(runner.getTargetToken() || suiteDesc.describe, desc);
                break;
            case JoinpointState.AfterReturning:
            case JoinpointState.AfterThrowing:
                desc.end = new Date().getTime();
                this.getReport().setCaseCompleted(desc);
                break;
        }
    }

}
