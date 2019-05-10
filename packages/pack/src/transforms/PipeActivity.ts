import { ITransform, NodeActivityContext, isTransform } from '../core';
import { Expression } from '@tsdi/activities';
import { isUndefined } from '@tsdi/ioc';
import { NodeActivity } from '../core/NodeActivity';

/**
 * pipe stream activity
 *
 * @export
 * @abstract
 * @class PipeActivity
 * @extends {Activity<ITransform>}
 */
export abstract class PipeActivity extends NodeActivity<ITransform> {

    /**
   * execute stream pipe.
   *
   * @protected
   * @param {NodeActivityContext} ctx
   * @param {ITransform} stream stream pipe from
   * @param {GActivityType<ITransform>} transform steam pipe to.
   * @param {boolean} [waitend=false] wait pipe end or not.
   * @returns {Promise<ITransform>}
   * @memberof TransformActivity
   */
    protected async executePipe(ctx: NodeActivityContext, stream: ITransform, transform: Expression<ITransform>, waitend = false): Promise<ITransform> {
        let next: ITransform;
        let transPipe = await this.resolveExpression(transform, ctx);
        let vaild = false;
        if (isTransform(stream)) {
            if (isTransform(transPipe) && !transPipe.changeAsOrigin) {
                vaild = true;
            } else {
                next = stream;
            }
        } else if (isTransform(transPipe) && transPipe.changeAsOrigin) {
            next = transPipe;
        }

        if (vaild) {
            next = stream.pipe(transPipe);
            if (waitend) {
                return await new Promise((r, j) => {
                    next
                        .once('end', r)
                        .once('error', j);
                }).then(() => {
                    next.removeAllListeners('error');
                    next.removeAllListeners('end');
                    return next;
                }, err => {
                    next.removeAllListeners('error');
                    next.removeAllListeners('end');
                    if (!isUndefined(process)) {
                        console.error(err);
                        process.exit(1);
                        return err;
                    } else {
                        return Promise.reject(new Error(err));
                    }
                });
            }
        }
        return next;
    }
}
