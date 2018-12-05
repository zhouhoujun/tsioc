import { Task } from '../decorators';
import { IActivityContext, ChainConfigure, InjectAcitityToken, IActivity, IHandleActivity, IChainActivity } from '../core';
import { HandleActivity } from './HandleActivity';
import { ControlActivity } from './ControlActivity';
import { lang } from '@ts-ioc/core';


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
@Task(ChainActivityToken)
export class ChainActivity extends ControlActivity implements IChainActivity {

    protected handles: IHandleActivity[];

    async onActivityInit(config: ChainConfigure): Promise<any> {
        await super.onActivityInit(config);
        if (config.handles && config.handles.length) {
            this.handles = await Promise.all(config.handles.map(cfg => this.buildActivity(cfg)))
        }
        this.handles = (this.handles || []).filter(act => act instanceof HandleActivity);
    }

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
     * handle request.
     *
     * @protected
     * @param {IActivityContext} ctx
     * @param {() => Promise<void>} [next]
     * @returns {Promise<void>}
     * @memberof ChainActivity
     */
    protected handleRequest(ctx: IActivityContext, next?: () => Promise<void>): Promise<void> {
        return lang.runInChain((this.handles || []).map(act => {
            return async (ctx: IActivityContext, next?: () => Promise<void>) => {
                let called = false;
                await act.run(ctx, () => {
                    called = true;
                    return next()
                });
                if (!called && next) {
                    await next();
                }
            };
        }), ctx, next);
    }

    use(...activities: IActivity[]) {
        activities.forEach(activity => {
            if (activity instanceof HandleActivity) {
                this.handles.push(activity);
            }
        });
    }
}
