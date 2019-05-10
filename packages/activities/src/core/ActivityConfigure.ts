import { InjectToken, Type, PromiseUtil, Token, ProviderTypes } from '@tsdi/ioc';
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
    parallel = 'parallel',
    interval = 'interval',
    each = 'each'
}

/**
 * activity configuration.
 *
 * @export
 * @interface ActivityConfigure
 * @extends {RunnableConfigure}
 * @template T
 */
export interface ActivityConfigure extends RunnableConfigure {
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
     * activities component template scope.
     *
     * @type {ActivityTemplate}
     * @memberof ActivityConfigure
     */
    template?: ActivityTemplate;
}

/**
 * template option.
 *
 * @export
 * @interface TemplateOption
 * @template T
 */
export interface TemplateOption {
    /**
     * activity selector math the template option tag.
     *
     * @type {string}
     * @memberof ConditionOption
     */
    activity?: string | Activities | Type<any>;
}


export interface InvokeTemplate extends TemplateOption {
    target: Expression<Token<any>>,
    method: Expression<string>,
    args: Expression<ProviderTypes[]>
}


export interface IBodyTemplate {
    body?: ActivityType[];
}

export interface BodyTemplate extends TemplateOption, IBodyTemplate {
}


export interface IExpressionTemplate {
    /**
     * expression
     *
     * @type {Expression<any>}
     * @memberof ExpressionOption
     */
    expression: Expression<any>;
}

/**
 * expression option.
 *
 * @export
 * @interface ExpressionTemplate
 * @extends {ActivityOption}
 */
export interface ExpressionTemplate extends TemplateOption, IExpressionTemplate {
}


export interface IConditionTemplate {
    /**
     * condition
     *
     * @type {Expression<boolean>}
     * @memberof ConditionOption
     */
    condition: Expression<boolean>;
}

/**
 * condition option.
 *
 * @export
 * @interface ConditionTemplate
 * @extends {ActivityOption}
 */
export interface ConditionTemplate extends BodyTemplate, IConditionTemplate {
}

export interface EachTeamplate extends BodyTemplate {
    each: Expression<any[]>
}

/**
 * timer template.
 *
 * @export
 * @interface TimerTemplate
 * @extends {BodyTemplate}
 */
export interface TimerTemplate extends BodyTemplate {
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
 * @extends {TemplateOption}
 */
export interface ThrowTemplate extends TemplateOption {
    throw: Expression<Error>;
}

export interface SwitchTemplate extends TemplateOption {
    switch: Expression<string | number>;
    cases: CaseTemplate[];
    defaults?: ActivityType[];
}

/**
 * case template.
 */
export interface CaseTemplate extends IBodyTemplate {
    /**
     * case
     *
     * @type {*}
     * @memberof CaseTemplate
     */
    case: any;
}

export interface CatchTemplate extends IBodyTemplate {
    /**
     * to catch typeof this error.
     *
     * @type {Type<Error>}
     * @memberof CatchTemplate
     */
    error: Type<Error>;
}

export interface TryTemplate extends TemplateOption {
    try: ActivityType[];
    catchs?: CatchTemplate[];
    finally?: ActivityType[];
}

export type ControlTemplate = TemplateOption | ExpressionTemplate | ConditionTemplate | EachTeamplate | InvokeTemplate
    | BodyTemplate | TimerTemplate | ThrowTemplate | SwitchTemplate | TryTemplate;


export type TemplateType = Type<any> | ControlTemplate | PromiseUtil.ActionHandle<ActivityContext>;

/**
*  activity type.
*/
export type GActivityType<T> = Activity<T> | Type<Activity<T>> | TemplateType;

/**
 *  activity type.
 */
export type ActivityType = GActivityType<any>;

/**
 * activity template.
 */
export type ActivityTemplate = TemplateType | TemplateType[];

/**
 * expression.
 */
export type Expression<T> = T | Promise<T> | ((ctx: ActivityContext) => T | Promise<T>) | Type<any>;


