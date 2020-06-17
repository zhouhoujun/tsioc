import { tokenId, TokenId } from '@tsdi/ioc';
import { IAnnoationContext } from '@tsdi/boot';
import { IComponentContext } from '@tsdi/components';
import { ActivityOption } from './ActivityOption';
import { IWorkflowContext } from './IWorkflowContext';
import { IActivityExecutor } from './IActivityExecutor';
import { ICoreInjector } from '@tsdi/core';
import { Expression, ActivityMetadata } from './ActivityMetadata';


export const CTX_RUN_PARENT: TokenId<IAnnoationContext> = tokenId<IAnnoationContext>('CTX_RUN_PARENT');
export const CTX_RUN_SCOPE: TokenId<IActivityContext> = tokenId<IActivityContext>('CTX_RUN_SCOPE');
export const CTX_BASEURL: TokenId<string> = tokenId<string>('CTX_BASEURL');


export interface IActivityContext extends IComponentContext<ActivityOption> {
    /**
     * activity input data.
     */
    getInput<T = any>(): T;

    /**
     * activity process data.
     */
    getData<T = any>(): T;

    /**
     * activity parent origin process data.
     */
    getOriginData<T = any>(): T;

    readonly baseURL: string;

    readonly runScope: IActivityContext;

    /**
     * annoation metadata.
     */
    getAnnoation(): ActivityMetadata;

    readonly workflow: IWorkflowContext;

    getExector(): IActivityExecutor;

    resolveExpression<TVal>(express: Expression<TVal>, injector?: ICoreInjector): Promise<TVal>

}
