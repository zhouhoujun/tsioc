import { InjectToken, Type, PromiseUtil } from '@tsdi/ioc';
import { BootOption } from '@tsdi/boot';
import { Activity } from './Activity';
import { WorkflowInstance } from './WorkflowInstance';
import { ActivityContext } from './ActivityContext';


export const WorkflowId = new InjectToken<string>('Workflow_ID');





/**
 * condition option.
 *
 * @export
 * @interface ConditionOption
 * @extends {ActivityOption}
 */
export interface ConditionOption<T extends ActivityContext> {
    /**
     * condition
     *
     * @type {Expression<boolean>}
     * @memberof ConditionOption
     */
    condition: Expression<boolean>;
    /**
     * body.
     *
     * @type {(ActivityType<T> | ActivityType<T>[])}
     * @memberof ConditionOption
     */
    body: ActivityType<T> | ActivityType<T>[];
}


/**
 * activity option.
 *
 * @export
 * @interface ActivityOption
 * @extends {BootOption}
 */
export interface ActivityOption<T extends ActivityContext> extends BootOption {
    /**
     * workflow id.
     *
     * @type {string}
     * @memberof ActivityOption
     */
    id?: string;
    /**
    * action name.
    *
    * @type {string}
    * @memberof ActivityOption
    */
    name?: string;
    /**
     * input data
     *
     * @type {*}
     * @memberof IRunContext
     */
    input?: any;
    /**
     * task title.
     *
     * @type {string}
     * @memberof IActivityConfigure
     */
    title?: string;

    /**
     * selector.
     *
     * @type {string}
     * @memberof ActivityConfigure
     */
    selector?: string;

    /**
     * target module instace.
     *
     * @type {*}
     * @memberof BootContext
     */
    target?: Activity<T>;

    /**
     * bootstrap reference runable service.
     *
     * @type {WorkflowInstance<T>}
     * @memberof BootContext
     */
    runnable?: WorkflowInstance<T>;
}


export interface IfActivityOption<T extends ActivityContext> {
    if: ConditionOption<T>;
    elseif?: ConditionOption<T> | ConditionOption<T>[];
    else?: ActivityType<T> | ActivityType<T>[];
}

export interface ConfirmActivityOption<T extends ActivityContext> {
    confirm: ConditionOption<T>;
}

export interface WhileActivityOption<T extends ActivityContext> {
    while: ConditionOption<T>;
}

export interface DoWhileActivityOption<T extends ActivityContext> {
    dowhile: ConditionOption<T>;
}

export interface SequenceOption<T extends ActivityContext> {
    sequence: ActivityType<T>[];
}

export interface ParallelOption<T extends ActivityContext> {
    parallel: ActivityType<T>[];
}


export interface TimerOption<T extends ActivityContext> {
    /**
     * time.
     *
     * @type {Expression<number>}
     * @memberof TimerOption
     */
    time: Expression<number>;
    /**
     * body.
     *
     * @type {(ActivityType<T> | ActivityType<T>[])}
     * @memberof ConditionOption
     */
    body: ActivityType<T> | ActivityType<T>[];
}

export interface DeplylOption<T extends ActivityContext> {
    delay: TimerOption<T>;
}

export interface IntervalOption<T extends ActivityContext> {
    interval: TimerOption<T>;
}

export interface ThrowOption<T extends ActivityContext> {
    throw: Expression<Error>;
}

export interface SwitchOption<T extends ActivityContext> {
    switch: Expression<any>;
    cases: CaseOption<T>[];
}

export interface CaseOption<T extends ActivityContext> {
    case: Expression<any>;
    /**
     * body.
     *
     * @type {(ActivityType<T> | ActivityType<T>[])}
     * @memberof ConditionOption
     */
    body: ActivityType<T> | ActivityType<T>[];
}


export interface TryCatchOption<T extends ActivityContext> {
    try: ActivityType<T>[];
    catchs: ActivityType<T>[];
    finally?: ActivityType<T>
}

export type ControlType<T extends ActivityContext> =
    IfActivityOption<T> | ConfirmActivityOption<T>
    | WhileActivityOption<T> | DoWhileActivityOption<T> | SequenceOption<T> | ParallelOption<T>
    | DeplylOption<T> | IntervalOption<T> | ThrowOption<T> | SwitchOption<T> | TryCatchOption<T>;


/**
 *  activity type.
 */
export type ActivityType<T extends ActivityContext> = Type<any> | Activity<T> | PromiseUtil.ActionHandle<T> | ControlType<T>;

/**
 * expression.
 */
export type Expression<T> = T | Promise<T> | ((ctx: ActivityContext) => T | Promise<T>) | Type<any>;

/**
 * context type.
 */
export type CtxType<T> = T | ((context?: ActivityContext, activity?: Activity<any>) => T);

