import {
    Injectable, isNullOrUndefined, Inject, IContainer, ContainerToken, isFunction,
    isPromise, Type, hasOwnClassMetadata, ObjectMap, isClass
} from '@ts-ioc/core';
import { IActivity } from './IActivity';
import { ITranslator } from './Translator';
import { Events, AppConfigureToken, ProcessRunRootToken } from '@ts-ioc/bootstrap';
import { InputDataToken, IActivityContextResult, CtxType, ActivityContextToken } from './IActivityContext';
import { ActivityBuilderToken } from './IActivityBuilder';
import { ActivityBuilder } from './ActivityBuilder';
import { Expression, ActivityConfigure, isWorkflowInstance } from './ActivityConfigure';
import { Task } from '../decorators';
import { isAcitvity } from './Activity';



/**
 * base activity execute context.
 *
 * @export
 * @class ActivityContext
 * @implements {IActivityContext<any>}
 */
@Injectable(ActivityContextToken)
export class ActivityContext<T> extends Events implements IActivityContextResult<T> {

    @Inject(ContainerToken)
    private _container: IContainer;

    @Inject(ActivityBuilderToken)
    private _actBuilder: ActivityBuilder;

    /**
     * build config.
     *
     * @type {*}
     * @memberof BuidActivityContext
     */
    config: any;

    /**
     * execute data.
     *
     * @type {T}
     * @memberof IActivityContext
     */
    protected data: T;

    /**
     * execute activity.
     *
     * @type {IActivity}
     * @memberof IRunContext
     */
    execute: IActivity;

    /**
     * target activiy.
     *
     * @type {IActivity}
     * @memberof ActivityContext
     */
    target: IActivity;

    constructor(@Inject(InputDataToken) public input: any) {
        super();
        this.setAsResult(input);
    }


    /**
     * get ioc container.
     *
     * @returns {IContainer}
     * @memberof IContext
     */
    getContainer(): IContainer {
        return this._container;
    }

    getBuilder(): ActivityBuilder {
        return this._actBuilder;
    }

    /**
     * execute Resulte.
     *
     * @readonly
     * @memberof ActivityContext
     */
    get result(): T {
        return this.data;
    }

    set result(data: T) {
        if (data !== this.data) {
            this.emit('resultChanged', data);
        }
        this.data = data;
    }

    setAsResult(data: any) {
        this.result = this.translate(data);
    }

    protected translate(data: any): any {
        if (isNullOrUndefined(data)) {
            return null;
        }
        if (data instanceof ActivityContext) {
            this.target = data.target;
            data = data.result;
        }
        let translator = this.getTranslator(data);
        if (translator) {
            return translator.translate(data);
        }
        return data;
    }

    protected getTranslator(input: any): ITranslator {
        return null;
    }

    getRootPath(): string {
        if (this.config && this.config.baseURL) {
            return this.config.baseURL;
        }
        return this.getContainer().get(ProcessRunRootToken) || '.';
    }


    getEnvArgs(): ObjectMap<any> {
        return {};
    }

    to<T>(target: CtxType<T>, config?: ActivityConfigure): T {
        if (isFunction(target)) {
            if (isClass(target)) {
                return target as any;
            }
            return target(this, config);
        } else {
            return target;
        }
    }

    /**
     * exec activity result.
     *
     * @template T
     * @param {IActivity} target
     * @param {Expression<T>} result
     * @returns {Promise<T>}
     * @memberof IContext
     */
    exec<T>(target: IActivity, expression: Expression<T>): Promise<T> {
        if (isFunction(expression)) {
            return Promise.resolve(expression(this, target));
        } else if (isPromise(expression)) {
            return expression;
        } else if (isAcitvity(expression)) {
            return expression.run(this).then(ctx => ctx.result);
        } else if (isWorkflowInstance(expression)) {
            return expression.start(this).then(ctx => ctx.result);
        } else {
            return Promise.resolve(expression as T);
        }
    }

    isTask(task: Type<IActivity>): boolean {
        return hasOwnClassMetadata(Task, task);
    }
}
