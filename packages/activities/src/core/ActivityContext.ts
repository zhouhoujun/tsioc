import { Injectable, Type, Refs, ContainerFactory, InjectToken, lang } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { BootContext, createAnnoationContext, IModuleReflect } from '@tsdi/boot';
import { ActivityExecutor } from './ActivityExecutor';
import { ActivityOption } from './ActivityOption';
import { Activity } from './Activity';
import { WorkflowInstance } from './WorkflowInstance';
import { ActivityConfigure, ActivityTemplate, Expression } from './ActivityConfigure';

/**
 * workflow context token.
 */
export const WorkflowContextToken = new InjectToken<ActivityContext>('WorkflowContext');

/**
 *  each body.
 */
export const EachBodyToken = new InjectToken<any>('each_body');
/**
 * base activity execute context.
 *
 * @export
 * @class ActivityContext
 */
@Injectable
@Refs(Activity, BootContext)
@Refs('@Task', BootContext)
export class ActivityContext extends BootContext {
    /**
     * workflow id.
     *
     * @type {string}
     * @memberof ActivityContext
     */
    id: string;
    /**
    * action name.
    *
    * @type {string}
    * @memberof ActivityOption
    */
    name: string;
    /**
     * activities component template scope.
     *
     * @type {ActivityTemplate}
     * @memberof ActivityConfigure
     */
    template?: ActivityTemplate;
    /**
     * activity annoation metadata.
     *
     * @type {ActivityConfigure}
     * @memberof ActivityContext
     */
    annoation: ActivityConfigure;
    /**
     * bootstrap runnable service.
     *
     * @type {WorkflowInstance}
     * @memberof BootContext
     */
    runnable?: WorkflowInstance;
    /**
     * current result.
     *
     * @type {*}
     * @memberof ActivityContext
     */
    result?: any;

    /**
     * previous if elseif condition.
     *
     * @type {boolean}
     * @memberof ActivityContext
     */
    preCondition: boolean;


    get body() {
        return this.getContext(EachBodyToken) || {};
    }

    getCurrBaseURL() {
        let baseURL = '';
        if (this.runnable) {
            let mgr = this.reflects;
            this.runnable.status.scopes.some(s => {
                if (s.scope.$scopes && s.scope.$scopes.length) {
                    return s.scope.$scopes.some(c => {
                        let refl = mgr.get<IModuleReflect>(lang.getClass(c));
                        if (refl && refl.baseURL) {
                            baseURL = refl.baseURL;
                        }
                        return !!baseURL
                    })
                }
                return false;
            });
        }
        return baseURL || this.baseURL;
    }

    static parse(target: Type | ActivityOption, raiseContainer?: ContainerFactory<IContainer>): ActivityContext {
        return createAnnoationContext(ActivityContext, target, raiseContainer);
    }

    private _executor: ActivityExecutor;
    getExector(): ActivityExecutor {
        if (!this._executor) {
            this._executor = this.getRaiseContainer().resolve(ActivityExecutor);
        }
        return this._executor;
    }

    resolveExpression<TVal>(express: Expression<TVal>, container?: IContainer): Promise<TVal> {
        return this.getExector().resolveExpression(this, express, container);
    }

}
