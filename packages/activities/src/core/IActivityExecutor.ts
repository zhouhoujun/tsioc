import { PromiseUtil, tokenId } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { Expression, ActivityType } from './ActivityMetadata';
import { WorkflowContext } from './WorkflowInstance';

/**
 * activity executor.
 *
 * @export
 * @interface IActivityExecutor
 */
export interface IActivityExecutor {
    /**
     * eval expression.
     *
     * @param {string} expression
     * @returns {*}
     * @memberof IActivityExecutor
     */
    eval(expression: string): any;
    /**
     * run activity in sub workflow.
     *
     * @template T
     * @param {ActivityType} activities
     * @returns {Promise<void>}
     * @memberof IActivityExecutor
     */
    runWorkflow<T extends WorkflowContext>(activities: ActivityType, data?: any): Promise<T>;
    /**
     * resolve expression.
     *
     * @template TVal
     * @param {Expression<TVal>} express
     * @param {ICoreInjector} [injector]
     * @returns {Promise<TVal>}
     * @memberof IActivityExecutor
     */
    resolveExpression<TVal>(express: Expression<TVal>, injector?: ICoreInjector): Promise<TVal>;
    /**
     * run activities.
     *
     * @param {(ActivityType | ActivityType[])} activities
     * @param {*} [input]
     * @param {() => Promise<void>} [next]
     * @returns {Promise<any>}
     * @memberof IActivityExecutor
     */
    runActivity(activities: ActivityType | ActivityType[], input?: any, next?: () => Promise<void>): Promise<any>;
    /**
     * execute actions.
     *
     * @template T
     * @param {(PromiseUtil.ActionHandle<T> | PromiseUtil.ActionHandle<T>[])} actions
     * @param {() => Promise<void>} [next]
     * @returns {Promise<void>}
     * @memberof IActivityExecutor
     */
    execAction<T extends WorkflowContext>(actions: PromiseUtil.ActionHandle<T> | PromiseUtil.ActionHandle<T>[], next?: () => Promise<void>): Promise<void>;

    /**
     * parse activites to actions.
     *
     * @template T
     * @param {(ActivityType | ActivityType[])} activities
     * @param {*} [input]
     * @returns {PromiseUtil.ActionHandle<T>}
     * @memberof IActivityExecutor
     */
    parseAction<T extends WorkflowContext>(activities: ActivityType | ActivityType[], input?: any): PromiseUtil.ActionHandle<T>;
}

export const ActivityExecutorToken = tokenId<IActivityExecutor>('ActivityExecutor');
