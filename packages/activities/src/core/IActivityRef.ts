import { AsyncHandler, IDestoryable, tokenId } from '@tsdi/ioc';
import { ActivityContext } from './ActivityContext';
import { IWorkflowContext } from './IWorkflowContext';
export const ACTIVITY_INPUT = tokenId<any>('ACTIVITY_INPUT');
export const ACTIVITY_DATA = tokenId<any>('ACTIVITY_DATA');
export const ACTIVITY_ORIGIN_DATA = tokenId<any>('ACTIVITY_ORIGIN_DATA');

export interface IActivityRef extends IDestoryable {
    name?: string;
    readonly isScope?: boolean;
    readonly context: ActivityContext;
    run(ctx: IWorkflowContext): Promise<void>;
    toAction(): AsyncHandler<IWorkflowContext>;
}
