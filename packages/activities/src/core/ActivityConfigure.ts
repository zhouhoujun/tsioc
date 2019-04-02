import { IActivity, IActivityResult } from './IActivity';
import { Token, isToken, isMetadataObject, isString } from '@tsdi/ioc';
import { WorkflowInstance } from './WorkflowInstance';
import { ExpressionActivity } from './ExpressionActivity';
import { ModuleConfigure } from '@tsdi/boot';
import { IActivityContext, CtxType } from './IActivityContext';
import { IWorkflowInstance } from './IWorkflowInstance';
import { IHandleActivity } from './IHandleActivity';


/**
 * key value pair.
 *
 * @export
 * @interface KeyValue
 * @template TKey
 * @template TVal
 */
export interface KeyValue<TKey, TVal> {
    /**
     * key of keyvalue pair.
     *
     * @type {TKey}
     * @memberof KeyValue
     */
    key: TKey;
    /**
     * value of keyvalue pair.
     *
     * @type {TVal}
     * @memberof KeyValue
     */
    value: TVal;
}

/**
 * async result.
 */
export type AsyncResult<T> = (ctx?: IActivityContext, activity?: IActivity) => Promise<T>;

/**
 * activity result.
 */
export type ExecuteResult<T> = Promise<T> | AsyncResult<T> | IWorkflowInstance<T>;

/**
 * expression.
 */
export type Expression<T> = T | ExecuteResult<T>;

/**
 * condition expression.
 */
export type Condition = Expression<boolean>;
/**
 *  expression token.
 */
export type ExpressionToken<T> = Expression<T> | Token<ExpressionActivity<T>>;

/**
 * ActivityResult type
 */
export type ActivityResultType<T> = Token<IActivityResult<T>> | Token<any> | IActivityConfigure<T>;

/**
 * expression type.
 */
export type ExpressionType<T> = Expression<T> | ActivityResultType<T>;

/**
 * core activities configures.
 */
export type GCoreActivityConfigs<T> = ActivityConfigure | ChainConfigure | IExecuteConfigure<T> | IDependenceConfigure<T> | ConfirmConfigure | IDelayConfigure<T> | IDoWhileConfigure<T>
    | IIfConfigure<T> | IIntervalConfigure<T> | IParallelConfigure<T> | ISequenceConfigure<T> | ISwitchConfigure<T>
    | ThrowConfigure | ITryCatchConfigure<T> | IWhileConfigure<T>;

/**
 * core activities configures.
 */
export type CoreActivityConfigs = ActivityConfigure | ChainConfigure | ExecuteConfigure | DependenceConfigure | ConfirmConfigure | DelayConfigure | DoWhileConfigure
    | IfConfigure | IntervalConfigure | ParallelConfigure | SequenceConfigure | SwitchConfigure
    | ThrowConfigure | TryCatchConfigure | WhileConfigure;

/**
 * activity type.
 */
export type ActivityType<T extends IActivity> = Token<T> | Token<IActivity> | CoreActivityConfigs;

/**
 * active
 */
export type Active = ActivityType<IActivity>;

/**
 * activity configure type.
 */
export type ConfigureType<T extends IActivity, TC extends ActivityConfigure> = Token<T> | TC | Token<IActivity>;

/**
 * target is workflow instance or not.
 *
 * @export
 * @param {*} target
 * @returns {target is IWorkflowInstance<any>}
 */
export function isWorkflowInstance(target: any): target is IWorkflowInstance<any> {
    return target instanceof WorkflowInstance;
}

/**
 * check target is activity type or not.
 *
 * @export
 * @param {*} target
 * @returns {target is ActivityType<any>}
 */
export function isActivityType(target: any, check = true): target is ActivityType<any> {
    if (!target) {
        return false;
    }

    if (isWorkflowInstance(target)) {
        return false;
    }

    // forbid string token for activity.
    if (isString(target)) {
        return false;
    }

    if (isToken(target)) {
        return true;
    }

    if (isMetadataObject(target)) {
        if (check) {
            return !!(target.activity || target.task || target.bootstrap);
        }
        return true;
    }

    return false;
}

/**
 * ActivityConfigure
 *
 * @export
 * @interface IActivityConfigure
 * @extends {ModuleConfigure}
 * @template T
 */
export interface IActivityConfigure<T> extends ModuleConfigure {
    /**
     * task title.
     *
     * @type {string}
     * @memberof IActivityConfigure
     */
    title?: string;
    /**
     * workflow uuid.
     *
     * @type {string}
     * @memberof ITaskConfigure
     */
    id?: string;

    /**
    * context tasks name.
    *
    * @type {string}
    * @memberof ITaskConfigure
    */
    name?: string;

    /**
     * run baseURL.
     *
     * @type {string}
     * @memberof ITaskConfigure
     */
    baseURL?: string;

    /**
     * custom data.
     *
     * @type {*}
     * @memberof IActivityConfigure
     */
    data?: any;

    /**
     * activity module.
     *
     * @type {Token<T>}
     * @memberof ITaskConfigure
     */
    task?: Token<T>;

    /**
     * activity module.
     *
     * @type {Token<T>}
     * @memberof ITaskConfigure
     */
    activity?: Token<T>;

    /**
     * set activity context type.
     *
     * @type {Token<IActivityContext>}
     * @memberof IActivityConfigure
     */
    contextType?: Token<IActivityContext>;

    /**
     * the context type must extends of the type.
     *
     * @type {Token<IActivityContext>}
     * @memberof IActivityConfigure
     */
    baseContextType?: Token<IActivityContext>;

}

/**
 * task configure.
 *
 * @export
 * @interface IConfigure
 * @extends {IActivityConfigure<IActivity>}
 */
export interface ActivityConfigure extends IActivityConfigure<IActivity> {
    /**
     * selector.
     *
     * @type {string}
     * @memberof ActivityConfigure
     */
    selector?: string;
}

/**
 * execute activity configure.
 *
 * @export
 * @interface ExecuteConfigure
 * @extends {ActivityConfigure}
 * @template T
 */
export interface IExecuteConfigure<T> extends ActivityConfigure {
    /**
     * execute activity body.
     *
     * @type {ExpressionToken<T>}
     * @memberof ExecuteConfigure
     */
    execute?: ExpressionToken<T>;
}

/**
 * execute activity configure.
 *
 * @export
 * @interface ExecuteConfigure
 * @extends {IExecuteConfigure<Active>}
 */
export interface ExecuteConfigure extends IExecuteConfigure<Active> {

}


export interface InvokeConfigure extends ActivityConfigure {
    target: ExpressionToken<any>;
    invoke: ExpressionToken<string>;
    args: ExpressionToken<any[]>;
}

/**
 * handle configure.
 *
 * @export
 * @interface HandleConfigure
 * @extends {ActivityConfigure}
 */
export interface HandleConfigure extends ActivityConfigure {

}


export type HandleType = IHandleActivity | Token<IHandleActivity> | HandleConfigure;

/**
 * chain configure.
 *
 * @export
 * @interface ChainConfigure
 * @extends {ActivityConfigure}
 */
export interface ChainConfigure extends ActivityConfigure {
    /**
     * handle activities.
     *
     * @type {CtxType<HandleType[]>}
     * @memberof ChainConfigure
     */
    handles?: CtxType<HandleType[]>;
}

/**
 * Confirm activity configure.
 *
 * @export
 * @interface ConfirmConfigure
 * @extends {ActivityConfigure}
 */
export interface IConfirmConfigure<T> extends ActivityConfigure {
    /**
     * confirm expression.
     *
     * @type {ExpressionType<boolean>}
     * @memberof ConfirmConfigure
     */
    confirm: ExpressionType<boolean>;

    /**
     * target dependence
     *
     * @type {T}
     * @memberof IDependenceConfigure
     */
    body: T
}

/**
 * confirm configure.
 *
 * @export
 * @interface ConfirmConfigure
 * @extends {IConfirmConfigure<Active>}
 */
export interface ConfirmConfigure extends IConfirmConfigure<Active> {

}

/**
 * Dependence activity configure.
 *
 * @export
 * @interface IDependenceConfigure
 * @extends {ActivityConfigure}
 */
export interface IDependenceConfigure<T> extends ActivityConfigure {
    /**
     * dependence activity.
     *
     * @type {T}
     * @memberof DelayConfigure
     */
    dependence: T;

    /**
     * target dependence
     *
     * @type {T}
     * @memberof IDependenceConfigure
     */
    body: T
}

/**
 * depdence configure.
 *
 * @export
 * @interface DependenceConfigure
 * @extends {IDependenceConfigure<Active>}
 */
export interface DependenceConfigure extends IDependenceConfigure<Active> {

}

/**
 * delay activity configure.
 *
 * @export
 * @interface IDelayConfigure
 * @extends {ActivityConfigure}
 */
export interface IDelayConfigure<T> extends ActivityConfigure {
    /**
     * delay ms.
     *
     * @type {ExpressionType<number>}
     * @memberof DelayConfigure
     */
    delay: ExpressionType<number>;

    /**
     * delay body.
     *
     * @type {T}
     * @memberof IDelayConfigure
     */
    body?: T;
}

/**
 * delay activity configure.
 *
 * @export
 * @interface DelayConfigure
 * @extends {IDelayConfigure<Active>}
 */
export interface DelayConfigure extends IDelayConfigure<Active> {

}

/**
 * DoWhile activity configure.
 *
 * @export
 * @interface IDoWhileConfigure
 * @extends {ActivityConfigure}
 * @template T
 */
export interface IDoWhileConfigure<T> extends ActivityConfigure {
    /**
     * do while
     *
     * @type {Active}
     * @memberof DoWhileConfigure
     */
    do: Active;

    /**
     * while condition
     *
     * @type {ExpressionType<boolean>}
     * @memberof DoWhileConfigure
     */
    while: ExpressionType<boolean>;
}

/**
 * DoWhile activity configure.
 *
 * @export
 * @interface DoWhileConfigure
 * @extends {ActivityConfigure}
 */
export interface DoWhileConfigure extends IDoWhileConfigure<Active> {
}

/**
 * If activity configure.
 *
 * @export
 * @interface IfConfigure
 * @extends {ActivityConfigure}
 * @template T
 */
export interface IIfConfigure<T> extends ActivityConfigure {

    /**
     * while condition
     *
     * @type {ExpressionType<boolean>}
     * @memberof IfConfigure
     */
    if: ExpressionType<boolean>;

    /**
     * if body
     *
     * @type {T}
     * @memberof IfConfigure
     */
    ifBody: T;

    /**
     * else body
     *
     * @type {T}
     * @memberof IfConfigure
     */
    elseBody?: T;

}

/**
 * If activity configure.
 *
 * @export
 * @interface IfConfigure
 * @extends {IIfConfigure<Active>}
 */
export interface IfConfigure extends IIfConfigure<Active> {

}

/**
 * Interval activity configure.
 *
 * @export
 * @interface IIntervalConfigure
 * @extends {ActivityConfigure}
 * @template T
 */
export interface IIntervalConfigure<T> extends ActivityConfigure {
    /**
     * Interval ms.
     *
     * @type {ExpressionType<number>}
     * @memberof IntervalConfigure
     */
    interval: ExpressionType<number>;

    /**
     * Interval body.
     *
     * @type {T}
     * @memberof WhileConfigure
     */
    body: T
}

/**
 * Interval activity configure.
 *
 * @export
 * @interface IntervalConfigure
 * @extends {IIntervalConfigure<Active>}
 */
export interface IntervalConfigure extends IIntervalConfigure<Active> {

}

/**
 *  Parallel activity configure.
 *
 * @export
 * @interface IParallelConfigure
 * @extends {ActivityConfigure}
 * @template T
 */
export interface IParallelConfigure<T> extends ActivityConfigure {
    /**
     * parallel activities.
     *
     * @type {T[]}
     * @memberof ParallelConfigure
     */
    parallel?: T[];
}
/**
 * Parallel activity configure.
 *
 * @export
 * @interface ParallelConfigure
 * @extends {ActivityConfigure}
 */
export interface ParallelConfigure extends IParallelConfigure<Active> {
}

/**
 * sequence activity configure.
 *
 * @export
 * @interface ISequenceConfigure
 * @extends {ActivityConfigure}
 * @template T
 */
export interface ISequenceConfigure<T> extends ActivityConfigure {
    /**
     * sequence activities.
     *
     * @type {T[]}
     * @memberof IConfigure
     */
    sequence: T[];
}

/**
 * sequence activity configure.
 *
 * @export
 * @interface SequenceConfigure
 * @extends {ActivityConfigure}
 */
export interface SequenceConfigure extends ISequenceConfigure<Active> {

}

/**
 * Switch activity configure.
 *
 * @export
 * @interface SwitchConfigure
 * @extends {ActivityConfigure}
 * @template T
 */
export interface ISwitchConfigure<T> extends ActivityConfigure {

    /**
     * switch condition
     *
     * @type {ExpressionType<any>}
     * @memberof SwitchConfigure
     */
    switch: ExpressionType<any>;

    /**
     * if body
     *
     * @type {KeyValue<any, T>[]}
     * @memberof SwitchConfigure
     */
    cases: KeyValue<any, T>[];

    /**
     * default body
     *
     * @type {T}
     * @memberof SwitchConfigure
     */
    defaultBody?: T;
}
/**
 * Switch activity configure.
 *
 * @export
 * @interface SwitchConfigure
 * @extends {ISwitchConfigure<Active>}
 */
export interface SwitchConfigure extends ISwitchConfigure<Active> {

}


/**
 * Throw activity configure.
 *
 * @export
 * @interface ThrowConfigure
 * @extends {ActivityConfigure}
 */
export interface ThrowConfigure extends ActivityConfigure {
    /**
     * delay ms.
     *
     * @type {CtxType<number>}
     * @memberof ThrowConfigure
     */
    throw?: Expression<Error> | ActivityResultType<Error>;
}


/**
 * TryCatch activity configure.
 *
 * @export
 * @interface ITryCatchConfigure
 * @extends {ChainConfigure}
 * @template T
 */
export interface ITryCatchConfigure<T> extends ChainConfigure {
    /**
     * try activity.
     *
     * @type {CtxType<number>}
     * @memberof TryCatchConfigure
     */
    try: T;

    /**
     * catchs activities.
     *
     * @type {T[]}
     * @memberof TryCatchConfigure
     */
    catchs: HandleType[];

    /**
     * finally activity.
     *
     * @type {T}
     * @memberof TryCatchConfigure
     */
    finally?: T;
}

/**
 * TryCatch activity configure.
 *
 * @export
 * @interface TryCatchConfigure
 * @extends {ITryCatchConfigure<Active>}
 */
export interface TryCatchConfigure extends ITryCatchConfigure<Active> {

}


/**
 * While activity configure.
 *
 * @export
 * @interface IWhileConfigure
 * @extends {ActivityConfigure}
 * @template T
 */
export interface IWhileConfigure<T> extends ActivityConfigure {

    /**
     * while condition
     *
     * @type {(ExpressionType<boolean>)}
     * @memberof WhileConfigure
     */
    while: ExpressionType<boolean>;

    /**
     * while body.
     *
     * @type {T}
     * @memberof WhileConfigure
     */
    body: T;
}

/**
 * While activity configure.
 *
 * @export
 * @interface WhileConfigure
 * @extends {IWhileConfigure<Active>}
 */
export interface WhileConfigure extends IWhileConfigure<Active> {

}
