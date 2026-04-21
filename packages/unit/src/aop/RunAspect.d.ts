import { LogAspect } from '@tsdi/logger';
import { JoinPoint } from '@tsdi/aop';
import { TestReport } from '../reports/interface';
export declare class RunAspect extends LogAspect {
    report: TestReport;
    getReport(): TestReport;
    beforeError(joinPoint: JoinPoint): void;
    beforeEachError(joinPoint: JoinPoint): void;
    afterEachError(joinPoint: JoinPoint): void;
    afterError(joinPoint: JoinPoint): void;
    logSuite(joinPoint: JoinPoint): void;
    logTestCase(joinPoint: JoinPoint): void;
}
