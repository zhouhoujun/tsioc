import { LogAspect } from '@tsdi/logger';
import { Aspect, Around, JoinPoint, JoinpointState, AfterThrowing } from '@tsdi/aop';

import { DefaultTestReport } from '../reports/TestReport';
import { TestReport, SuiteDescribe, ICaseDescribe } from '../reports/interface';
import { UnitRunner } from '../runner/Runner';
import { SuiteRunner } from '../runner/SuiteRunner';
import { OldTestRunner } from '../runner/OldTestRunner';
import { E2ERunner } from '../runner/E2ERunner';

@Aspect({
    within: [SuiteRunner, OldTestRunner, E2ERunner],
    singleton: true
})
export class RunAspect extends LogAspect {

    report!: TestReport;
    getReport(): TestReport {
        if (!this.report) {
            this.report = this.injector.get(DefaultTestReport)
        }
        return this.report
    }

    @AfterThrowing('execution(*.runBefore)')
    beforeError(joinPoint: JoinPoint) {
        this.getReport().track(joinPoint.throwing)
    }

    @AfterThrowing('execution(*.runBeforeEach)')
    beforeEachError(joinPoint: JoinPoint) {
        this.getReport().track(joinPoint.throwing)
    }

    @AfterThrowing('execution(*.runAfterEach)')
    afterEachError(joinPoint: JoinPoint) {
        this.getReport().track(joinPoint.throwing)
    }

    @AfterThrowing('execution(*.runAfter)')
    afterError(joinPoint: JoinPoint) {
        this.getReport().track(joinPoint.throwing)
    }

    @Around('execution(*.runSuite)')
    logSuite(joinPoint: JoinPoint) {
        const runner = joinPoint.target as UnitRunner;
        const argDesc = joinPoint.args?.[0];
        switch (joinPoint.state) {
            case JoinpointState.Before:
                let describe = 'Unknown';
                let cases: ICaseDescribe[] = [];
                let timeout: number | undefined;
                let start: [number, number] | undefined;
                let used: [number, number] | undefined;

                if (argDesc) {
                    describe = (argDesc as SuiteDescribe).describe || runner.type?.name || 'Unknown';
                    cases = (argDesc as any).cases || [];
                    timeout = argDesc.timeout;
                    start = (argDesc as any).start;
                    used = (argDesc as any).used;
                } else {
                    describe = runner.type?.name || 'Unknown';
                }

                const suiteDesc: SuiteDescribe = {
                    describe,
                    cases,
                    timeout,
                    start,
                    used
                };
                this.getReport().addSuite(runner.type || describe, suiteDesc);
                break;
            case JoinpointState.AfterReturning:
            case JoinpointState.AfterThrowing:
                this.getReport().setSuiteCompleted(runner.type || (argDesc as any)?.describe);
                break;
        }
    }

    @Around('execution(*.runCase)')
    logTestCase(joinPoint: JoinPoint) {
        const desc = joinPoint.args?.[0] as ICaseDescribe;
        const suiteDesc = joinPoint.args && joinPoint.args.length > 1 ? joinPoint.args[1] : {};
        const runner = joinPoint.target as SuiteRunner;
        switch (joinPoint.state) {
            case JoinpointState.Before:
                this.getReport().addCase(runner.type || (suiteDesc as SuiteDescribe)?.describe, desc);
                break;
            case JoinpointState.AfterReturning:
            case JoinpointState.AfterThrowing:
                this.getReport().setCaseCompleted(desc);
                break;
        }
    }

}
