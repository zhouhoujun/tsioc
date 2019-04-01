import { Task } from '../decorators/Task';
import { TryCatchConfigure } from '../core';
import { ChainActivity } from './ChainActivity';
import { ControlActivity } from './ControlActivity';


/**
 * while control activity.
 *
 * @export
 * @class TryCatchActivity
 * @extends {ControlActivity}
 */
@Task(ControlActivity, 'try')
export class TryCatchActivity extends ChainActivity {

    protected async execute(): Promise<void> {
        let config = this.context.config as TryCatchConfigure;
        try {
            await this.execActivity(config.try, this.context);
        } catch (err) {
            let ctx = this.createContext(err);
            await this.handleRequest(ctx, (config.catchs || []).concat(this.handles || []));
        } finally {
            await this.execActivity(config.finally, this.context);
        }
    }
}
