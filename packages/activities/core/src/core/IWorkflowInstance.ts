import { IActivityResult, IActivity, ActivityToken } from './IActivity';
import { Observable } from 'rxjs';
import { Joinpoint } from '@ts-ioc/aop';
import { IService, IRunner, InjectRunnableToken } from '@ts-ioc/bootstrap';
import { IActivityContextResult } from './IActivityContext';



/**
 * activity runner token.
 */
export const WorkflowInstanceToken = new InjectRunnableToken<IActivity>(ActivityToken);

/**
 *run state.
 *
 * @export
 * @enum {number}
 */
export enum RunState {
    /**
     * activity init.
     */
    init,
    /**
     * runing.
     */
    running,
    /**
     * activity parused.
     */
    pause,
    /**
     * activity stopped.
     */
    stop,
    /**
     * activity complete.
     */
    complete
}

/**
 * task runner.
 *
 * @export
 * @interface ITaskRunner
 */
export interface IWorkflowInstance<T> extends IService<IActivityResult<T>>, IRunner<IActivityResult<T>> {

    /**
     * current run task data.
     *
     * @type {*}
     * @memberof ITaskRunner
     */
    readonly state: RunState;

    /**
     * run result, observable data.
     *
     * @type {Observable<any>}
     * @memberof ITaskRunner
     */
    readonly result: Observable<any>;

    /**
     * run result value
     *
     * @type {*}
     * @memberof ITaskRunner
     */
    readonly resultValue: any

    /**
     *state changed.
     *
     * @type {Observable<RunState>}
     * @memberof ITaskRunner
     */
    readonly stateChanged: Observable<RunState>;

    /**
     * start activity.
     *
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof ITask
     */
    start(data?: any): Promise<IActivityContextResult<T>>;

    /**
     * stop running activity.
     *
     * @memberof ITaskRunner
     */
    stop(): Promise<any>;

    /**
     * pause running activity.
     *
     * @memberof ITaskRunner
     */
    pause(): Promise<any>;

    /**
     * save state.
     *
     * @param {Joinpoint} state
     * @memberof ITaskRunner
     */
    saveState(state: Joinpoint);

}

