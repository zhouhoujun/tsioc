import { ITestReport, ISuiteDescribe, ICaseDescribe } from './ITestReport';
import { Singleton, Inject, ContainerToken, IContainer, Token, InjectToken, Type } from '@ts-ioc/core';
import { Reporter } from './Reporter';

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
            this.suites.set(suit, describe)
        }
    }

    getSuite(suit: Token<any>): ISuiteDescribe {
        return this.suites.has(suit) ? this.suites.get(suit) : null;
    }

    addCase(suit: Token<any>, testCase: ICaseDescribe) {
        if (this.suites.has(suit)) {
            this.suites.get(suit).cases.push(testCase);
        }
    }

    getCase(suit: Token<any>, test: string): ICaseDescribe {
        let suite = this.getSuite(suit);
        if (suite) {
            return suite.cases.find(c => c.key === test);
        }
        return null;
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
