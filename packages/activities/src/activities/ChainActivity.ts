import { Task } from '../decorators/Task';
import { ChainConfigure, Activity, HandleType, ActivityContext } from '../core';
import { HandleActivity } from './HandleActivity';
import { ControlActivity } from './ControlActivity';
import { isFunction, isNullOrUndefined, PromiseUtil } from '@tsdi/ioc';


/**
 * chain activity.
 *
 * @export
 * @class ChainActivity
 * @extends {ControlActivity}
 */
@Task(ControlActivity, 'handles')
export class ChainActivity extends ControlActivity {

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


    protected runActivity<T>(activity: Activity, ctx: ActivityContext<T>, data?: any) {
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
    protected handleRequest<T>(ctx: ActivityContext<T>, handles: HandleType[], next?: () => Promise<void>): Promise<void> {
        return PromiseUtil.runInChain(handles.map(act => {
            return async (ctx: ActivityContext<T>, next?: () => Promise<void>) => {
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
