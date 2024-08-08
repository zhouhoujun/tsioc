import { Singleton, Token, Injector } from '@tsdi/ioc';
import { TestReport, SuiteDescribe, ICaseDescribe } from './interface';
import { Reporter, RealtimeReporter, UNIT_REPORTES } from './Reporter';
import { HrtimeFormatter } from '@tsdi/core';


/**
 * default test report. implements {@link TestReport}
 *
 * @export
 * @class DefaultTestReport
 * @implements {TestReport}
 */
@Singleton()
export class DefaultTestReport implements TestReport {

    suites: Map<Token, SuiteDescribe>;

    reports!: Reporter[];
    getReports() {
        if (!this.reports) {
            this.reports = this.injector.get(UNIT_REPORTES)
        }
        return this.reports || []
    }

    constructor(private injector: Injector, protected hrtime: HrtimeFormatter) {
        this.suites = new Map()
    }

    track(error: Error): void {
        this.reports.forEach(rep => {
            rep.track(error)
        })
    }

    addSuite(suit: Token, describe: SuiteDescribe): void {
        if (!this.suites.has(suit)) {
            describe.start = this.hrtime.hrtime();
            // init suite must has no completed cases.
            if(describe.cases.length) {
                describe = { ...describe};
            }
            describe.cases = [];

            this.suites.set(suit, describe);

            this.getReports().forEach(async rep => {
                if (rep instanceof RealtimeReporter) {
                    rep.renderSuite(describe)
                }
            })
        }
    }

    getSuite(suit: Token): SuiteDescribe {
        return this.suites.get(suit)!
    }

    setSuiteCompleted(suit: Token): void {
        const suite = this.getSuite(suit);
        if (suite) {
            suite.used = this.hrtime.hrtime(suite.start);
        }
    }

    addCase(suit: Token, testCase: ICaseDescribe): void {
        if (this.suites.has(suit)) {
            testCase.start = this.hrtime.hrtime();
            this.suites.get(suit)?.cases.push(testCase)
        }
    }

    getCase(suit: Token, test: string): ICaseDescribe {
        const suite = this.getSuite(suit);
        if (suite) {
            let tCase = suite.cases.find(c => c.key === test)!;
            if (!tCase) {
                tCase = suite.cases.find(c => c.title === test)!
            }
            return tCase
        }
        return null!
    }

    setCaseCompleted(testCase: ICaseDescribe) {
        testCase.used = this.hrtime.hrtime(testCase.start);

        this.getReports().forEach(async rep => {
            if (rep instanceof RealtimeReporter) {
                rep.renderCase(testCase)
            }
        })
    }

    async report(): Promise<void> {
        await Promise.all(this.getReports().map(rep => {
            if (rep) {
                return rep.render(this.suites)
            }
            return null
        }))
    }
}
