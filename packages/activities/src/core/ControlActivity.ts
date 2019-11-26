import { BootContext } from '@tsdi/boot';
import { Activity } from './Activity';
import { ActivityContext } from './ActivityContext';

/**
 * control
 *
 * @export
 * @abstract
 * @class ControlActivity
 * @extends {Activity<T>}
 * @template T
 */
export abstract class ControlActivity<T = any> extends Activity<T> {

    protected setActivityResult(ctx: ActivityContext) {

    }

    protected setContextResult(ctx: ActivityContext) {

    }

    cleanCtrlState(ctx: BootContext) {

    }

    setCtrlState(ctx: BootContext) {

    }
}

