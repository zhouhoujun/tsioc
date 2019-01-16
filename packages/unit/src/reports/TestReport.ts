import { ITestReport, ISuiteDescribe, ICaseDescribe } from './ITestReport';
import { Singleton, Inject, ContainerToken, IContainer, Token, InjectToken, Type, lang } from '@ts-ioc/core';
import { Reporter, RealtimeReporter } from './Reporter';

export const ReportsToken = new InjectToken<Type<Reporter>[]>('unit-reports')

@Singleton
export class TestReport implements ITestReport {

    @Inject(ContainerToken)
    container: IContainer;

    suites: Map<Token<any>, ISuiteDescribe>;

    constructor() {
        this.suites = new Map();
    }

    addSuite(suit: Token<any>, describe: ISuiteDescribe) {
        if (!this.suites.has(suit)) {
            // init suite must has no completed cases.
            if (describe.cases.length) {
                describe = lang.omit(describe, 'cases');
            }
            describe.cases = [];

            this.suites.set(suit, describe);
            (this.container.get(ReportsToken) || []).forEach(r => {
                let rep = this.container.get<Reporter>(r);
                if (rep instanceof RealtimeReporter) {
                    rep.renderSuite(describe);
                }
            });
        }
    }

    getSuite(suit: Token<any>): ISuiteDescribe {
        return this.suites.has(suit) ? this.suites.get(suit) : null;
    }

    setSuiteCompleted(describe: ISuiteDescribe) {

    }

    addCase(suit: Token<any>, testCase: ICaseDescribe) {
        if (this.suites.has(suit)) {
            let suite = this.suites.get(suit);
            this.suites.get(suit).cases.push(testCase);
        }
    }

    getCase(suit: Token<any>, test: string): ICaseDescribe {
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
        (this.container.get(ReportsToken) || []).forEach(r => {
            let rep = this.container.get<Reporter>(r);
            if (rep instanceof RealtimeReporter) {
                rep.renderCase(testCase);
            }
        });
    }

    async report(): Promise<void> {
        await Promise.all((this.container.get(ReportsToken) || []).map(r => {
            let rep = this.container.get<Reporter>(r);
            if (rep) {
                return rep.render(this.suites);
            }
            return null;
        }));
    }
}
