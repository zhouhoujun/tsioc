import { Singleton, Inject, Token, Type, lang, INJECTOR, tokenId, TokenId } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { ITestReport, ISuiteDescribe, ICaseDescribe } from './ITestReport';
import { Reporter, RealtimeReporter } from './Reporter';
import { ROOT_INJECTOR } from '@tsdi/boot';

/**
 * report token.
 */
export const ReportsToken: TokenId<Type<Reporter>[]> = tokenId<Type<Reporter>[]>('unit-reports')

/**
 * test report.
 *
 * @export
 * @class TestReport
 * @implements {ITestReport}
 */
@Singleton()
export class TestReport implements ITestReport {

    @Inject(INJECTOR)
    injector: ICoreInjector;

    suites: Map<Token, ISuiteDescribe>;

    resports: Reporter[];
    getReports() {
        if (!this.resports || this.resports.length < 0) {
            this.resports = this.injector.getServices(Reporter);
            console.log(this.injector.get(ROOT_INJECTOR)['exports']);
        }
        return this.resports || [];
    }

    constructor() {
        this.suites = new Map();
    }

    addSuite(suit: Token, describe: ISuiteDescribe) {
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
        return this.suites.has(suit) ? this.suites.get(suit) : null;
    }

    setSuiteCompleted(suit: Token) {
        let suite = this.getSuite(suit);
        if (suite) {
            suite.end = new Date().getTime();
        }
    }

    addCase(suit: Token, testCase: ICaseDescribe) {
        if (this.suites.has(suit)) {
            testCase.start = new Date().getTime();
            this.suites.get(suit).cases.push(testCase);
        }
    }

    getCase(suit: Token, test: string): ICaseDescribe {
        let suite = this.getSuite(suit);
        if (suite) {
            let tCase = suite.cases.find(c => c.key === test);
            if (!tCase) {
                tCase = suite.cases.find(c => c.title === test);
            }
            return tCase;
        }
        return null;
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
