import { PromiseUtil, IDestoryable, tokenId } from '@tsdi/ioc';
import { WorkflowContext } from './WorkflowInstance';
import { ActivityContext } from './ActivityContext';

export const ACTIVITY_INPUT = tokenId<any>('ACTIVITY_INPUT');
export const ACTIVITY_DATA = tokenId<any>('ACTIVITY_DATA');
export const ACTIVITY_ORIGIN_DATA = tokenId<any>('ACTIVITY_ORIGIN_DATA');

export interface IActivityRef extends IDestoryable {
    name?: string;
    readonly isScope?: boolean;
    readonly context: ActivityContext;
    run(ctx: WorkflowContext): Promise<void>;
    toAction(): PromiseUtil.ActionHandle<WorkflowContext>;
}
