import { Singleton, Inject, Token, lang, Injector } from '@tsdi/ioc';
import { TestReport, SuiteDescribe, ICaseDescribe } from './interface';
import { Reporter, RealtimeReporter, UNIT_REPORTES } from './Reporter';


/**
 * default test report. implements {@link TestReport}
 *
 * @export
 * @class DefaultTestReport
 * @implements {TestReport}
 */
@Singleton()
export class DefaultTestReport implements TestReport {

    @Inject()
    injector!: Injector;

    suites: Map<Token, SuiteDescribe>;

    reports!: Reporter[];
    getReports() {
        if (!this.reports) {
            this.reports = this.injector.get(UNIT_REPORTES)
        }
        return this.reports || []
    }

    constructor() {
        this.suites = new Map()
    }

    track(error: Error): void {
        this.reports.forEach(rep=> {
            rep.track(error)
        })
    }

    addSuite(suit: Token, describe: SuiteDescribe): void {
        if (!this.suites.has(suit)) {
            describe.start = new Date().getTime();
            // init suite must has no completed cases.
            if (describe.cases.length) {
                describe = lang.omit(describe, 'cases')
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
            suite.end = new Date().getTime()
        }
    }

    addCase(suit: Token, testCase: ICaseDescribe): void {
        if (this.suites.has(suit)) {
            testCase.start = new Date().getTime();
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
        testCase.end = new Date().getTime();

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
