import { PromiseUtil, InjectToken } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
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
     * @param {IContainer} [container]
     * @returns {Promise<TVal>}
     * @memberof IActivityExecutor
     */
    resolveExpression<TVal>(express: Expression<TVal>, container?: IContainer): Promise<TVal>;
    /**
     * run activities.
     *
     * @param {(ActivityType | ActivityType[])} activities
     * @param {() => Promise<void>} [next]
     * @returns {Promise<void>}
     * @memberof IActivityExecutor
     */
    runActivity(activities: ActivityType | ActivityType[], next?: () => Promise<void>): Promise<void>;
    /**
     * execute actions.
     *
     * @template T
     * @param {PromiseUtil.ActionHandle<T>[]} actions
     * @param {() => Promise<void>} [next]
     * @returns {Promise<void>}
     * @memberof IActivityExecutor
     */
    execActions<T extends WorkflowContext>(actions: PromiseUtil.ActionHandle<T>[], next?: () => Promise<void>): Promise<void>;
    /**
     * parse activity to action.
     *
     * @template T
     * @param {ActivityType} activity
     * @returns {PromiseUtil.ActionHandle<T>}
     * @memberof IActivityExecutor
     */
    parseAction<T extends WorkflowContext>(activity: ActivityType): PromiseUtil.ActionHandle<T>;

    /**
     * parse activites to actions.
     *
     * @template T
     * @param {(ActivityType | ActivityType[])} activities
     * @returns {PromiseUtil.ActionHandle<T>[]}
     * @memberof IActivityExecutor
     */
    parseActions<T extends WorkflowContext>(activities: ActivityType | ActivityType[]): PromiseUtil.ActionHandle<T>[];
}

export const ActivityExecutorToken = new InjectToken<IActivityExecutor>('ActivityExecutor');
