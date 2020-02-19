import { isDefined, Singleton } from '@tsdi/ioc';
import { Expression } from '@tsdi/activities';
import { NodeActivity } from '../NodeActivity';
import { ITransform, isTransform } from '../ITransform';
import { NodeActivityContext } from '../NodeActivityContext';


/**
 * transform activity.
 *
 * @export
 * @abstract
 * @class TransfrmActivity
 * @extends {NodeActivity<ITransform>}
 */
export abstract class TransformActivity extends NodeActivity<ITransform> {

}

@Singleton()
export class TransformService {
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
    async executePipe(ctx: NodeActivityContext, stream: ITransform, transform: Expression<ITransform>, waitend = false): Promise<ITransform> {

        let transPipe: ITransform;
        if (isTransform(transform)) {
            transPipe = transform as ITransform;
        } else {
            transPipe = await ctx.resolveExpression(transform);
        }
        let next: ITransform = stream.pipe(transPipe);
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
                if (isDefined(process)) {
                    console.error(err);
                    process.exit(1);
                    return err;
                } else {
                    return Promise.reject(new Error(err));
                }
            });
        }
        return next;
    }
}
