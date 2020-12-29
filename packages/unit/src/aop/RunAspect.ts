import { Aspect, Around, Joinpoint, JoinpointState, AfterThrowing } from '@tsdi/aop';
import { LoggerAspect } from '@tsdi/logs';
import { TestReport } from '../reports/TestReport';
import { ITestReport, ISuiteDescribe, ICaseDescribe } from '../reports/ITestReport';
import { ISuiteRunner } from '../runner/ISuiteRunner';
import { SuiteRunner } from '../runner/SuiteRunner';
import { OldTestRunner } from '../runner/OldTestRunner';

@Aspect({
    within: [SuiteRunner, OldTestRunner],
    singleton: true
})
export class RunAspect extends LoggerAspect {

    report: ITestReport;
    getReport(): ITestReport {
        if (!this.report) {
            this.report = this.injector.resolve(TestReport);
        }
        return this.report;
    }

    @AfterThrowing('execution(*.runBefore)')
    beforeError(joinPoint: Joinpoint) {
        this.getReport().track(joinPoint.throwing);
    }

    // @AfterThrowing('execution(*.runBeforeEach)')
    // beforeEachError(joinPoint: Joinpoint) {
    //     this.getReport().trackError(joinPoint.throwing);
    // }

    // @AfterThrowing('execution(*.runAfterEach)')
    // afterEachError(joinPoint: Joinpoint) {
    //     this.getReport().trackError(joinPoint.throwing);
    // }

    @AfterThrowing('execution(*.runAfter)')
    afterError(joinPoint: Joinpoint) {
        this.getReport().track(joinPoint.throwing);
    }

    @Around('execution(*.runSuite)')
    logSuite(joinPoint: Joinpoint) {
        let runner = joinPoint.target as ISuiteRunner;
        let desc = joinPoint.args[0] as ISuiteDescribe;
        switch (joinPoint.state) {
            case JoinpointState.Before:
                this.getReport().addSuite(runner.getBootType() || desc.describe, desc);
                break;
            case JoinpointState.AfterReturning:
            case JoinpointState.AfterThrowing:
                this.getReport().setSuiteCompleted(runner.getBootType() || desc.describe);
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
                this.getReport().addCase(runner.getBootType() || suiteDesc.describe, desc);
                break;
            case JoinpointState.AfterReturning:
            case JoinpointState.AfterThrowing:
                this.getReport().setCaseCompleted(desc);
                break;
        }
    }

}
