import { lang, Injectable, Invocation, AbstractType } from '@tsdi/ioc';
import { Before, BeforeEach, Test, After, AfterEach } from '../metadata';
import { BeforeTestMetadata, BeforeEachTestMetadata, TestCaseMetadata, SuiteMetadata } from '../metadata';
import { Assert } from '../assert/assert';
import { SuiteDescribe, ICaseDescribe } from '../reports/interface';
import { UnitRunner } from './Runner';
import { E2ESuiteDescribe, E2EStepMetadata } from '../e2e/E2EMetadata';
import { Given, When, Then, And } from '../e2e/E2EMetadata';

@Injectable({ static: false })
export class E2ERunner<T = object> extends UnitRunner<T> {

    constructor(readonly invocation: Invocation) {
        super();  
    }

    get type(): AbstractType<T> {
        return this.invocation.type
    }

    timeout!: number;
    describe!: string;

    async run(): Promise<void> {
        const desc = this.getSuiteDescribe();
        await this.runSuite(desc)
    }

    getSuiteDescribe(): E2ESuiteDescribe {
        const meta = this.invocation.classRef.getAnnotation() as SuiteMetadata;
        this.timeout = (meta && meta.timeout) ? meta.timeout : (3 * 60 * 60 * 1000);
        this.describe = meta.describe || this.invocation.classRef.className;
        return {
            timeout: this.timeout,
            describe: this.describe,
            cases: [],
            scenarioSteps: []
        }
    }

    protected getScenarioSteps(): E2EStepMetadata[] {
        const steps: E2EStepMetadata[] = [];
        
        const givens = this.invocation.classRef.getDefines<E2EStepMetadata>(Given);
        givens.forEach(df => {
            steps.push({
                ...df.metadata,
                stepType: 'Given',
                method: df.propertyKey
            });
        });

        const whens = this.invocation.classRef.getDefines<E2EStepMetadata>(When);
        whens.forEach(df => {
            steps.push({
                ...df.metadata,
                stepType: 'When',
                method: df.propertyKey
            });
        });

        const thens = this.invocation.classRef.getDefines<E2EStepMetadata>(Then);
        thens.forEach(df => {
            steps.push({
                ...df.metadata,
                stepType: 'Then',
                method: df.propertyKey
            });
        });

        const ands = this.invocation.classRef.getDefines<E2EStepMetadata>(And);
        ands.forEach(df => {
            steps.push({
                ...df.metadata,
                stepType: 'And',
                method: df.propertyKey
            });
        });

        return steps.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    async runSuite(desc: E2ESuiteDescribe): Promise<void> {
        // Build scenario steps
        desc.scenarioSteps = this.getScenarioSteps();
        
        await this.runBefore(desc);
        await this.runScenario(desc);
        await this.runAfter(desc)
    }

    runTimeout(key: string, describe: string, timeout?: number): Promise<any> {
        const instance = this.invocation.instance;
        const defer = lang.defer();
        const context = this.invocation.injector;
        let timer = setTimeout(() => {
            if (timer) {
                clearTimeout(timer);
                const assert = context.get(Assert);
                const err = new assert.AssertionError({
                    message: `${describe}, timeout ${timeout}`,
                    stackStartFunction: instance[key],
                    stackStartFn: instance[key]
                });
                defer.reject(err)
            }
        }, timeout || this.timeout);

        Promise.resolve(this.invocation.invoke(key))
            .then(r => {
                clearTimeout(timer);
                timer = null!;
                defer.resolve(r)
            })
            .catch(err => {
                clearTimeout(timer);
                timer = null!;
                defer.reject(err)
            })

        return defer.promise
    }

    async runBefore(describe: SuiteDescribe) {
        const befores = this.invocation.classRef.getDefines<BeforeTestMetadata>(Before);
        await lang.step(
            befores.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'suite before ' + df.propertyKey,
                    df.metadata.timeout)
            })).catch(err => {
                this.runAfter(describe);
                throw err;
            })
    }

    async runBeforeEach() {
        const befores = this.invocation.classRef.getDefines<BeforeEachTestMetadata>(BeforeEach);
        await lang.step(
            befores.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'before each ' + df.propertyKey,
                    df.metadata.timeout)
            }))
    }

    async runAfterEach() {
        const afters = this.invocation.classRef.getDefines<BeforeEachTestMetadata>(AfterEach);
        await lang.step(afters.map(df => () => {
            return this.runTimeout(
                df.propertyKey,
                'after each ' + df.propertyKey,
                df.metadata.timeout)
        }))
    }

    async runAfter(describe: SuiteDescribe) {
        const afters = this.invocation.classRef.getDefines<BeforeTestMetadata>(After);
        await lang.step(
            afters.map(df => () => {
                return this.runTimeout(
                    df.propertyKey,
                    'suite after ' + df.propertyKey,
                    df.metadata.timeout)
            }))
    }

    async runScenario(desc: E2ESuiteDescribe): Promise<void> {
        const tests = this.invocation.classRef.getDefines<TestCaseMetadata>(Test);
        
        if (tests && tests.length > 0) {
            await lang.step(
                tests.map(df => {
                    return {
                        key: df.propertyKey,
                        order: df.metadata.setp,
                        timeout: df.metadata.timeout,
                        title: df.metadata.title ?? df.propertyKey
                    } as ICaseDescribe;
                })
                    .sort((a, b) => {
                        return b.order! - a.order!
                    })
                    .map(caseDesc => {
                        return () => this.runCase(caseDesc)
                    }))
        } else {
            await this.runScenarioSteps(desc);
        }
    }

    async runScenarioSteps(desc: E2ESuiteDescribe): Promise<void> {
        const steps = desc.scenarioSteps || [];
        
        for (const step of steps) {
            await this.runBeforeEach();
            try {
                await this.runTimeout(
                    step.method as string,
                    `${step.stepType}: ${step.description || step.keyword}`,
                    step.timeout)
            } catch (err) {
                const errorStep: ICaseDescribe = {
                    title: `${step.stepType}: ${step.description || step.keyword}`,
                    key: step.method as string,
                    error: err as Error
                };
                desc.cases.push(errorStep);
                throw err;
            } finally {
                await this.runAfterEach();
            }
        }
    }

    async runCase(caseDesc: ICaseDescribe): Promise<ICaseDescribe> {
        try {
            await this.runBeforeEach();
            await this.runTimeout(
                caseDesc.key,
                caseDesc.title,
                caseDesc.timeout)
        } catch (err) {
            caseDesc.error = err as Error
        } finally {
            try {
                await this.runAfterEach()
            } catch (err) {
                caseDesc.error = err as Error
            }
        }
        return caseDesc
    }

}