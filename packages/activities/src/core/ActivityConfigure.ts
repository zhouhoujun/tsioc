import { InjectToken, Type, PromiseUtil, Token } from '@tsdi/ioc';
import { RunnableConfigure } from '@tsdi/boot';
import { Activity } from './Activity';
import { ActivityContext } from './ActivityContext';


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
 * activity configuration.
 *
 * @export
 * @interface ActivityConfigure
 * @extends {RunnableConfigure}
 * @template T
 */
export interface ActivityConfigure<T extends ActivityContext> extends RunnableConfigure {
    /**
    * action name.
    *
    * @type {string}
    * @memberof ActivityConfigure
    */
    name?: string;
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
     * activities component template scope.
     *
     * @type {ActivityTemplate<T>}
     * @memberof ActivityConfigure
     */
    template?: ActivityTemplate<T>
}

/**
 * template option.
 *
 * @export
 * @interface TemplateOption
 * @template T
 */
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

export interface InvokeTemplate<T extends ActivityContext> extends TemplateOption<T> {
    invoke: Expression<InvokeTarget>;
}


export interface IBodyTemplate<T extends ActivityContext> {
    body?: ActivityType<T>[];
}


export interface BodyTemplate<T extends ActivityContext> extends TemplateOption<T>, IBodyTemplate<T> {
}

/**
 * condition option.
 *
 * @export
 * @interface ConditionTemplate
 * @extends {ActivityOption}
 */
export interface ConditionTemplate<T extends ActivityContext> extends BodyTemplate<T> {
    /**
     * condition
     *
     * @type {Expression<boolean>}
     * @memberof ConditionOption
     */
    condition: Expression<boolean>;
}

/**
 * timer template.
 *
 * @export
 * @interface TimerTemplate
 * @extends {BodyTemplate<T>}
 * @template T
 */
export interface TimerTemplate<T extends ActivityContext> extends BodyTemplate<T> {
    /**
     * time.
     *
     * @type {Expression<number>}
     * @memberof TimerOption
     */
    time: Expression<number>;
}

/**
 * throw template.
 *
 * @export
 * @interface ThrowTemplate
 * @extends {TemplateOption<T>}
 * @template T
 */
export interface ThrowTemplate<T extends ActivityContext> extends TemplateOption<T> {
    throw: Expression<Error>;
}

export interface SwitchTemplate<T extends ActivityContext> extends TemplateOption<T> {
    switch: Expression<string | number>;
    cases: CaseTemplate<T>[];
    defaults?: ActivityType<T>[];
}

export interface CaseTemplate<T extends ActivityContext> extends IBodyTemplate<T> {
    /**
     * case
     *
     * @type {*}
     * @memberof CaseTemplate
     */
    case: any;
}

export interface CatchTemplate<T extends ActivityContext> extends IBodyTemplate<T> {
    /**
     * to catch typeof this error.
     *
     * @type {Type<Error>}
     * @memberof CatchTemplate
     */
    error: Type<Error>;
}

export interface TryTemplate<T extends ActivityContext> extends TemplateOption<T> {
    try: ActivityType<T>[];
    catchs?: CatchTemplate<T>[];
    finally?: ActivityType<T>[];
}

export type ControlTemplate<T extends ActivityContext> =
    ConditionTemplate<T> | InvokeTemplate<T> | BodyTemplate<T>
    | TimerTemplate<T> | ThrowTemplate<T> | SwitchTemplate<T> | TryTemplate<T>;


export type TemplateType<T extends ActivityContext> = Type<any> | ControlTemplate<T> | PromiseUtil.ActionHandle<T>;

/**
 *  activity type.
 */
export type ActivityType<T extends ActivityContext> = TemplateType<T> | Activity<T>;


export type ActivityTemplate<T extends ActivityContext> = TemplateType<T> | TemplateType<T>[];

/**
 * expression.
 */
export type Expression<T> = T | Promise<T> | ((ctx: ActivityContext) => T | Promise<T>) | Type<any>;


