import { Singleton, Inject, Token, Type, lang, tokenId, Injector } from '@tsdi/ioc';;
import { ITestReport, ISuiteDescribe, ICaseDescribe } from './ITestReport';
import { Reporter, RealtimeReporter } from './Reporter';

/**
 * report token.
 */
export const ReportsToken: Token<Type<Reporter>[]> = tokenId<Type<Reporter>[]>('unit-reports')

/**
 * test report.
 *
 * @export
 * @class TestReport
 * @implements {ITestReport}
 */
@Singleton()
export class TestReport implements ITestReport {

    @Inject()
    injector!: Injector;

    suites: Map<Token, ISuiteDescribe>;

    reports!: Reporter[];
    getReports() {
        if (!this.reports) {
            this.reports = this.injector.getServices(Reporter);
            console.log('reports:', this.reports);
        }
        return this.reports || [];
    }

    constructor() {
        this.suites = new Map();
    }

    track(error: Error): void {
        this.reports.forEach(rep=> {
            rep.track(error);
        });
    }

    addSuite(suit: Token, describe: ISuiteDescribe): void {
        if (!this.suites.has(suit)) {
            describe.start = new Date().getTime();
            // init suite must has no completed cases.
            if (describe.cases.length) {
                describe = lang.omit(describe, 'cases');
            }
            describe.cases = [];

            this.suites.set(suit, describe);

            this.getReports().forEach(async rep => {
                if (rep instanceof RealtimeReporter) {
                    rep.renderSuite(describe);
                }
            });
        }
    }

    getSuite(suit: Token): ISuiteDescribe {
        return this.suites.get(suit)!;
    }

    setSuiteCompleted(suit: Token): void {
        let suite = this.getSuite(suit);
        if (suite) {
            suite.end = new Date().getTime();
        }
    }

    addCase(suit: Token, testCase: ICaseDescribe): void {
        if (this.suites.has(suit)) {
            testCase.start = new Date().getTime();
            this.suites.get(suit)?.cases.push(testCase);
        }
    }

    getCase(suit: Token, test: string): ICaseDescribe {
        let suite = this.getSuite(suit);
        if (suite) {
            let tCase = suite.cases.find(c => c.key === test)!;
            if (!tCase) {
                tCase = suite.cases.find(c => c.title === test)!;
            }
            return tCase;
        }
        return null!;
    }

    setCaseCompleted(testCase: ICaseDescribe) {
        testCase.end = new Date().getTime();

        this.getReports().forEach(async rep => {
            if (rep instanceof RealtimeReporter) {
                rep.renderCase(testCase);
            }
        });

    }

    async report(): Promise<void> {
        await Promise.all(this.getReports().map(rep => {
            if (rep) {
                return rep.render(this.suites);
            }
            return null;
        }));
    }
}
