import { createDecorator, ActionType } from '@tsdi/ioc';
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

export interface Given extends TestDecorator<E2EStepMetadata> { }
export interface When extends TestDecorator<E2EStepMetadata> { }
export interface Then extends TestDecorator<E2EStepMetadata> { }
export interface And extends TestDecorator<E2EStepMetadata> { }
export interface But extends TestDecorator<E2EStepMetadata> { }

interface TestDecorator<T extends TestMetadata> {
    (description?: string, timeout?: number): MethodDecorator;
    (metadata?: T): MethodDecorator;
}

export const Given: Given = createDecorator<E2EStepMetadata>('Given', {
    actionType: ActionType.declaration,
    props: (description?: string, timeout?: number) => ({ description, timeout, stepType: 'Given' })
}) as Given;

export const When: When = createDecorator<E2EStepMetadata>('When', {
    actionType: ActionType.declaration,
    props: (description?: string, timeout?: number) => ({ description, timeout, stepType: 'When' })
}) as When;

export const Then: Then = createDecorator<E2EStepMetadata>('Then', {
    actionType: ActionType.declaration,
    props: (description?: string, timeout?: number) => ({ description, timeout, stepType: 'Then' })
}) as Then;

export const And: And = createDecorator<E2EStepMetadata>('And', {
    actionType: ActionType.declaration,
    props: (description?: string, timeout?: number) => ({ description, timeout, stepType: 'And' })
}) as And;

export const But: But = createDecorator<E2EStepMetadata>('But', {
    actionType: ActionType.declaration,
    props: (description?: string, timeout?: number) => ({ description, timeout, stepType: 'But' })
}) as But;

export interface BeforeScenario extends TestDecorator<TestMetadata> { }
export interface AfterScenario extends TestDecorator<TestMetadata> { }

export const BeforeScenario: BeforeScenario = createDecorator<TestMetadata>('BeforeScenario', {
    actionType: ActionType.declaration
}) as BeforeScenario;

export const AfterScenario: AfterScenario = createDecorator<TestMetadata>('AfterScenario', {
    actionType: ActionType.declaration
}) as AfterScenario;