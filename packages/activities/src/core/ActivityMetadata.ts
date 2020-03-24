import { Type, Token, ProviderTypes, ObjectMap, tokenId, AsyncHandler } from '@tsdi/ioc';
import { Binding, ElementTemplate, IComponentMetadata } from '@tsdi/components';
import { Activity } from './Activity';
import { IActivityContext } from './IActivityContext';
import { IWorkflowContext } from './IWorkflowContext';
import { IActivityRef } from './IActivityRef';
import { Template } from '@tsdi/boot';



/**
 * activity configuration.
 *
 * @export
 * @interface ActivityConfigure
 * @extends {RunnableConfigure}
 * @template T
 */
export interface ActivityMetadata extends IComponentMetadata {
    /**
    * action name.
    *
    * @type {string}
    * @memberof ActivityMetadata
    */
    name?: string;
    /**
     * base url.
     */
    baseURL?: string,
    /**
     * activities component template scope.
     *
     * @type {ActivityTemplate}
     * @memberof ActivityMetadata
     */
    template?: ActivityTemplate;

    /**
     * activity deps types.
     */
    deps?: Type[]

}

/**
 * workflow id.
 */
export const WorkflowId = tokenId<string>('WORKFLOW_ID');

/**
 * activities selectors.
 */
export type Activities = 'if' | 'elseif' | 'else' | 'dowhile' | 'while' | 'switch'
    | 'throw' | 'try' | 'catch' | 'invoke' | 'sequence' | 'parallel' | 'interval' | 'each' | 'execute';

/**
 * template option.
 *
 * @export
 * @interface TemplateOption
 * @template T
 */
export interface TemplateOption extends ElementTemplate, ObjectMap {
    /**
     * activity selector math the template option tag.
     *
     * @type {string}
     * @memberof ConditionOption
     */
    activity: string | Activities | Type;

    /**
     * action name.
     *
     * @type {Expression<string>}
     * @memberof TemplateOption
     */
    name?: Binding<string>;

    /**
     * component external attrs.
     */
    externals?: Expression<{
        /**
         * input data.
         *
         * @type {string}
         * @memberof TemplateOption
         */
        input?: Binding<any>;

        /**
         * input execute data.
         *
         * @type {string}
         * @memberof TemplateOption
         */
        data?: Binding<any>;
    }>
}


export interface InvokeTemplate extends TemplateOption {
    target: Binding<Token>,
    method: Binding<string>,
    args: Binding<ProviderTypes[]>
}

export interface ExecuteOption extends TemplateOption {
    action: Binding<(ctx: IActivityContext, bind?: IActivityContext) => void | Promise<void>>;
}


export interface BodyTemplate extends TemplateOption {
    body: Binding<ActivityType | ActivityType[]>;
}

/**
 * condition option.
 *
 * @export
 * @interface ConditionTemplate
 * @extends {ActivityOption}
 */
export interface ConditionTemplate extends TemplateOption, IConditionTemplate {
}

export interface IExpressionTemplate {
    /**
     * expression
     *
     * @type {Expression<any>}
     * @memberof ExpressionOption
     */
    expression: Binding<any>;
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
    condition: Binding<Expression<boolean>>;
}

export interface EachTeamplate extends BodyTemplate {
    parallel?: Binding<boolean>;
    each: Binding<Expression<any[]>>;
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
     * @type {Binding<Expression<number>>}
     * @memberof TimerOption
     */
    time: Binding<Expression<number>>;
}



/**
 * throw template.
 *
 * @export
 * @interface ThrowTemplate
 * @extends {TemplateOption}
 */
export interface ThrowTemplate extends TemplateOption {
    throw: Binding<Expression<Error>>;
}

export interface SwitchTemplate extends TemplateOption {
    switch: Binding<Expression<string | number>>;
    cases: Binding<CaseTemplate[]>;
    defaults?: Binding<ActivityType[]>;
}

/**
 * case template.
 */
export interface CaseTemplate extends BodyTemplate {
    /**
     * case
     *
     * @type {Binding<any>}
     * @memberof CaseTemplate
     */
    case: Binding<any>;
}

export interface CatchTemplate extends BodyTemplate {
    /**
     * to catch typeof this error.
     *
     * @type {Type<Error>}
     * @memberof CatchTemplate
     */
    error: Binding<Type<Error>>;
}

export interface TryTemplate extends TemplateOption {
    try: Binding<ActivityType[]>;
    catchs?: Binding<CatchTemplate[]>;
    finally?: Binding<ActivityType[]>;
}

export type ControlTemplate = Required<TemplateOption> | TemplateOption | ExecuteOption | ConditionTemplate | ExpressionTemplate | EachTeamplate | InvokeTemplate
    | TimerTemplate | ThrowTemplate | SwitchTemplate | TryTemplate;


export type TemplateType<T extends TemplateOption = ControlTemplate> = Template | Type | T | AsyncHandler<IWorkflowContext>;

/**
 *  activity type.
 */
export type ActivityType<TVal = any, T extends TemplateOption = ControlTemplate> = IActivityRef | Activity<TVal> | TemplateType<T>;

/**
 * activity template.
 */
export type ActivityTemplate<T extends TemplateOption = ControlTemplate> = TemplateType<T> | TemplateType<T>[];

/**
 * context expression.
 */
export type CtxExpression<T, TC extends IActivityContext> = T | Promise<T> | Type<Activity<T>> | IActivityRef | Type | ((ctx: TC, bind?: IActivityContext) => T | Promise<T>)

/**
 * expression.
 */
export type Expression<T = any> = CtxExpression<T, IActivityContext>;

