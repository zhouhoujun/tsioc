import { Task } from '../decorators';
import {
    IActivityContext, ChainConfigure, InjectAcitityToken,
    IActivity, IHandleActivity, IChainActivity, Activity, Active, HandleConfigure
} from '../core';
import { HandleActivity } from './HandleActivity';
import { ControlActivity } from './ControlActivity';
import { lang, isFunction, isToken, isBaseObject, Token } from '@ts-ioc/core';


/**
 * chain activity token.
 */
export const ChainActivityToken = new InjectAcitityToken<ChainActivity>('chain');


/**
 * chain activity.
 *
 * @export
 * @class ChainActivity
 * @extends {ControlActivity}
 */
@Task(ChainActivityToken, 'handles')
export class ChainActivity extends ControlActivity implements IChainActivity {

    protected handles: (IHandleActivity | Token<IHandleActivity> | HandleConfigure)[];

    /**
     * execute.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof ChainActivity
     */
    protected async execute(): Promise<void> {
        await this.handleRequest(this.context);
    }

    /**
     * execute activity.
     *
     * @param {IActivity} activity
     * @param {IActivityContext} ctx
     * @returns
     * @memberof Activity
     */
    protected async execActivity(activity: Activity | Active, ctx: IActivityContext | (() => IActivityContext), next?: () => Promise<void>): Promise<IActivityContext> {
        if (!activity) {
            return null;
        }
        let rctx = isFunction(ctx) ? ctx() : ctx;
        if (activity instanceof HandleActivity) {
            return await activity.run(rctx, next);
        } else if (isToken(activity) || isBaseObject(activity)) {
            let act = await this.buildActivity(activity);
            if (act && act instanceof HandleActivity) {
                return act.run(rctx, next);
            }
        }
    }

    /**
     * handle request.
     *
     * @protected
     * @param {IActivityContext} ctx
     * @param {() => Promise<void>} [next]
     * @returns {Promise<void>}
     * @memberof ChainActivity
     */
    protected handleRequest(ctx: IActivityContext, next?: () => Promise<void>): Promise<void> {
        let config = ctx.config as ChainConfigure;
        return lang.runInChain((config.handles || []).concat(this.handles || []).map(act => {
            return async (ctx: IActivityContext, next?: () => Promise<void>) => {
                let called = false;
                await this.execActivity(act, ctx, () => {
                    called = true;
                    return next()
                });
                if (!called && next) {
                    await next();
                }
            };
        }), ctx, next);
    }

    use(...activities: (IHandleActivity | Token<IHandleActivity> | HandleConfigure)[]) {
        this.handles = this.handles || [];
        activities.forEach(activity => {
            if (activity) {
                this.handles.push(activity);
            }
        });
    }
}
