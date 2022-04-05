import { EMPTY_OBJ } from '@tsdi/ioc';
import { Aspect, Around, Joinpoint, JoinpointState, AfterThrowing } from '@tsdi/aop';
import { LogAspect } from '@tsdi/logs';
import { DefaultTestReport } from '../reports/TestReport';
import { TestReport, SuiteDescribe, ICaseDescribe } from '../reports/interface';
import { UnitRunner } from '../runner/Runner';
import { SuiteRunner } from '../runner/SuiteRunner';
import { OldTestRunner } from '../runner/OldTestRunner';

@Aspect({
    within: [SuiteRunner, OldTestRunner],
    singleton: true
})
export class RunAspect extends LogAspect {

    report!: TestReport;
    getReport(): TestReport {
        if (!this.report) {
            this.report = this.injector.resolve(DefaultTestReport);
        }
        return this.report;
    }

    @AfterThrowing('execution(*.runBefore)')
    beforeError(joinPoint: Joinpoint) {
        this.getReport().track(joinPoint.throwing);
    }

    @AfterThrowing('execution(*.runBeforeEach)')
    beforeEachError(joinPoint: Joinpoint) {
        this.getReport().track(joinPoint.throwing);
    }

    @AfterThrowing('execution(*.runAfterEach)')
    afterEachError(joinPoint: Joinpoint) {
        this.getReport().track(joinPoint.throwing);
    }

    @AfterThrowing('execution(*.runAfter)')
    afterError(joinPoint: Joinpoint) {
        this.getReport().track(joinPoint.throwing);
    }

    @Around('execution(*.runSuite)')
    logSuite(joinPoint: Joinpoint) {
        let runner = joinPoint.target as UnitRunner;
        let desc = joinPoint.args?.[0] as SuiteDescribe;
        switch (joinPoint.state) {
            case JoinpointState.Before:
                this.getReport().addSuite(runner.type || desc.describe, desc);
                break;
            case JoinpointState.AfterReturning:
            case JoinpointState.AfterThrowing:
                this.getReport().setSuiteCompleted(runner.type || desc.describe);
                break;
        }
    }

    @Around('execution(*.runCase)')
    logTestCase(joinPoint: Joinpoint) {
        let desc = joinPoint.args?.[0] as ICaseDescribe;
        let suiteDesc = joinPoint.args && joinPoint.args.length > 1 ? joinPoint.args[1] : EMPTY_OBJ;
        let runner = joinPoint.target as SuiteRunner;
        switch (joinPoint.state) {
            case JoinpointState.Before:
                this.getReport().addCase(runner.type || suiteDesc.describe, desc);
                break;
            case JoinpointState.AfterReturning:
            case JoinpointState.AfterThrowing:
                this.getReport().setCaseCompleted(desc);
                break;
        }
    }

}
