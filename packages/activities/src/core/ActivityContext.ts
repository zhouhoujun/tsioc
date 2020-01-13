import { Injectable, Type, Refs, InjectToken, createRaiseContext, isToken, IInjector } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { BuildContext } from '@tsdi/boot';
import { ActivityExecutor } from './ActivityExecutor';
import { ActivityOption } from './ActivityOption';
import { Activity } from './Activity';
import { ActivityMetadata, Expression } from './ActivityMetadata';

/**
 * workflow context token.
 */
export const WorkflowContextToken = new InjectToken<ActivityContext>('WorkflowContext');


/**
 * activity execute context.
 *
 * @export
 * @class ActivityContext
 */
@Injectable
@Refs(Activity, BuildContext)
@Refs('@Task', BuildContext)
export class ActivityContext extends BuildContext<ActivityOption, ActivityMetadata> {

    static parse(injector: IInjector, target: Type | ActivityOption): ActivityContext {
        return createRaiseContext(injector, ActivityContext, isToken(target) ? { module: target } : target);
    }

    private _executor: ActivityExecutor;
    getExector(): ActivityExecutor {
        if (!this._executor) {
            this._executor = this.injector.get(ActivityExecutor, { provide: ActivityContext, useValue: this });
        }
        return this._executor;
    }

    resolveExpression<TVal>(express: Expression<TVal>, container?: IContainer): Promise<TVal> {
        return this.getExector().resolveExpression(express, container);
    }

}
