import { Task } from '../decorators';
import {
    IActivityContext, ChainConfigure, InjectAcitityToken,
    IChainActivity, Activity, Active, HandleType
} from '../core';
import { HandleActivity } from './HandleActivity';
import { ControlActivity } from './ControlActivity';
import { lang, isFunction, isToken, isBaseObject } from '@ts-ioc/core';


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

    protected handles: HandleType[];

    /**
     * execute.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof ChainActivity
     */
    protected async execute(): Promise<void> {
        let config = this.context.config as ChainConfigure;
        await this.handleRequest(this.context, (config.handles || []).concat(this.handles || []));
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
        } if (activity instanceof Activity) {
            return await activity.run(rctx);
        } else if (isToken(activity) || isBaseObject(activity)) {
            let act = await this.buildActivity(activity);
            if (act && act instanceof Activity) {
                if (activity instanceof HandleActivity) {
                    return await activity.run(rctx, next);
                } else {
                    return await act.run(rctx);
                }
            } else {
                console.log(act)
            }
        }
        return null;
    }

    /**
     * handle request.
     *
     * @protected
     * @param {IActivityContext} ctx
     * @param {HandleType[]} handles
     * @param {() => Promise<void>} [next]
     * @returns {Promise<void>}
     * @memberof ChainActivity
     */
    protected handleRequest(ctx: IActivityContext, handles: HandleType[], next?: () => Promise<void>): Promise<void> {
        return lang.runInChain(handles.map(act => {
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

    use(...activities: HandleType[]) {
        this.handles = this.handles || [];
        activities.forEach(activity => {
            if (activity) {
                this.handles.push(activity);
            }
        });
    }
}
