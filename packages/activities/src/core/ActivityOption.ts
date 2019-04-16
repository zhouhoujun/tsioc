import { InjectToken, Type, PromiseUtil, Token } from '@tsdi/ioc';
import { BootOption } from '@tsdi/boot';
import { Activity } from './Activity';
import { WorkflowInstance } from './WorkflowInstance';
import { ActivityContext } from './ActivityContext';
import { type } from 'os';


export const WorkflowId = new InjectToken<string>('Workflow_ID');


/**
 * selectors.
 *
 * @export
 * @enum {number}
 */
export enum Activities {
    if = 'if',
    elseif = 'elseif',
    else = 'else',
    dowhile = 'dowhile',
    while = 'while',
    switch = 'switch',
    throw = 'throw',
    try = 'try',
    catch = 'catch',
    invoke = 'invoke',
    sequence = 'sequence',
    parallel = 'parallel'
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

    /**
     * activities component template scope.
     *
     * @type {TemplateScope<T>}
     * @memberof ActivityOption
     */
    template?: TemplateScope<T>
}


export interface TemplateOption<T extends ActivityContext> {
    /**
     * name.
     *
     * @type {string}
     * @memberof TemplateOption
     */
    name?: string;
    /**
     * activity selector math the template option tag.
     *
     * @type {string}
     * @memberof ConditionOption
     */
    activity: string | Activities | Type<any>;
}



export interface InvokeTarget {
    target: Token<any>,
    method: string,
    args: any[]
}

export interface InvokeTargetOption<T extends ActivityContext>  extends TemplateOption<T> {
    invoke: Expression<InvokeTarget>;
}


export interface IBodyOption<T extends ActivityContext> {
    body?: ActivityType<T>[];
}


export interface BodyOption<T extends ActivityContext> extends TemplateOption<T>, IBodyOption<T> {
}

/**
 * condition option.
 *
 * @export
 * @interface ConditionOption
 * @extends {ActivityOption}
 */
export interface ConditionOption<T extends ActivityContext> extends BodyOption<T> {
    /**
     * condition
     *
     * @type {Expression<boolean>}
     * @memberof ConditionOption
     */
    condition: Expression<boolean>;
}


export interface TimerOption<T extends ActivityContext> extends BodyOption<T> {
    /**
     * time.
     *
     * @type {Expression<number>}
     * @memberof TimerOption
     */
    time: Expression<number>;
}

export interface ThrowOption<T extends ActivityContext> extends TemplateOption<T> {
    throw: Expression<Error>;
}

export interface SwitchOption<T extends ActivityContext> extends TemplateOption<T> {
    switch: Expression<string|number>;
    cases: CaseOption<T>[];
    defaults?: ActivityType<T>[];
}

export interface CaseOption<T extends ActivityContext> extends IBodyOption<T> {
    /**
     * case
     *
     * @type {*}
     * @memberof CaseOption
     */
    case: any;
}

export interface CatchOption<T extends ActivityContext> extends IBodyOption<T> {
    /**
     * to catch typeof this error.
     *
     * @type {Type<Error>}
     * @memberof CatchOption
     */
    error: Type<Error>;
}

export interface TryOption<T extends ActivityContext> extends TemplateOption<T> {
    try: ActivityType<T>[];
    catchs?: CatchOption<T>[];
    finally?: ActivityType<T>[];
}

export type ControlType<T extends ActivityContext> =
    ConditionOption<T> | InvokeTargetOption<T> | BodyOption<T>
    | TimerOption<T> | ThrowOption<T> | SwitchOption<T> | TryOption<T>;


export type TemplateType<T extends ActivityContext> = Type<any> | ControlType<T> | PromiseUtil.ActionHandle<T>;

/**
 *  activity type.
 */
export type ActivityType<T extends ActivityContext> = TemplateType<T> | Activity<T>;


export type TemplateScope<T extends ActivityContext> = TemplateType<T> | TemplateType<T>[];

/**
 * expression.
 */
export type Expression<T> = T | Promise<T> | ((ctx: ActivityContext) => T | Promise<T>) | Type<any>;

/**
 * context type.
 */
export type CtxType<T> = T | ((context?: ActivityContext, activity?: Activity<any>) => T);

