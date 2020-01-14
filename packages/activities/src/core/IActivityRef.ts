import { PromiseUtil, InjectToken, IDestoryable } from '@tsdi/ioc';
import { WorkflowContext } from './WorkflowInstance';
import { ActivityContext } from './ActivityContext';

export const ACTIVITY_INPUT = new InjectToken<any>('ACTIVITY_INPUT');
export const ACTIVITY_OUTPUT = new InjectToken<any>('ACTIVITY_OUTPUT');

export interface IActivityRef<T = any> extends IDestoryable {
    name?: string;
    readonly isScope?: boolean;
    readonly context: ActivityContext;
    run(ctx: WorkflowContext, next?: () => Promise<void>): Promise<void>;
    toAction(): PromiseUtil.ActionHandle<WorkflowContext>;
}
