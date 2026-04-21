import { TestMetadata } from '../metadata';
export interface E2EStepMetadata extends TestMetadata {
    stepType?: 'Given' | 'When' | 'Then' | 'And' | 'But';
    description?: string;
    keyword?: string;
    order?: number;
    method?: string | symbol;
}
export interface E2ESuiteDescribe extends SuiteDescribe {
    scenarioSteps?: E2EStepMetadata[];
}
interface SuiteDescribe {
    describe: string;
    timeout?: number;
    cases: any[];
}
export interface Given extends TestDecorator<E2EStepMetadata> {
}
export interface When extends TestDecorator<E2EStepMetadata> {
}
export interface Then extends TestDecorator<E2EStepMetadata> {
}
export interface And extends TestDecorator<E2EStepMetadata> {
}
export interface But extends TestDecorator<E2EStepMetadata> {
}
interface TestDecorator<T extends TestMetadata> {
    (description?: string, timeout?: number): MethodDecorator;
    (metadata?: T): MethodDecorator;
}
export declare const Given: Given;
export declare const When: When;
export declare const Then: Then;
export declare const And: And;
export declare const But: But;
export interface BeforeScenario extends TestDecorator<TestMetadata> {
}
export interface AfterScenario extends TestDecorator<TestMetadata> {
}
export declare const BeforeScenario: BeforeScenario;
export declare const AfterScenario: AfterScenario;
export {};
