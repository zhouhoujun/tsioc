import { Task } from '../decorators/Task';
import {
    IActivityContext, ChainConfigure, InjectAcitityToken,
    IChainActivity, Activity, Active, HandleType
} from '../core';
import { HandleActivity } from './HandleActivity';
import { ControlActivity } from './ControlActivity';
import { isFunction, isNullOrUndefined, PromiseUtil } from '@ts-ioc/ioc';


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
        let handles = await this.getHandles(config);
        await this.handleRequest(this.context, handles);
    }

    /**
     * get handles.
     *
     * @protected
     * @param {ChainConfigure} config
     * @returns {Promise<HandleType[]>}
     * @memberof ChainActivity
     */
    protected async getHandles(config: ChainConfigure): Promise<HandleType[]> {
        let handles = this.context.to(config.handles) || [];
        return handles.concat(this.handles || []);
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
       return await super.execActivity(activity, ctx, next);
    }

    protected runActivity(activity: Activity, ctx: IActivityContext, data?: any) {
        if (isFunction(data) && activity instanceof HandleActivity) {
            return activity.run(ctx, data)
        } else {
            if (!isNullOrUndefined(data)) {
                ctx.setAsResult(data);
            }
            return activity.run(ctx);
        }
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
        return PromiseUtil.runInChain(handles.map(act => {
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
