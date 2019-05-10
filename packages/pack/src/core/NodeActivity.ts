import { Activity } from '@tsdi/activities';
import { NodeActivityContext } from './NodeActivityContext';

/**
 * activity for Nodejs server side.
 *
 * @export
 * @abstract
 * @class NodeActivity
 * @extends {Activity<T>}
 * @template T
 */
export abstract class NodeActivity<T> extends Activity<T> {
    /**
     * pipe stream activity
     *
     * @protected
     * @abstract
     * @param {NodeActivityContext} ctx
     * @returns {Promise<void>}
     * @memberof PipeActivity
     */
    protected abstract execute(ctx: NodeActivityContext): Promise<void>;
}
