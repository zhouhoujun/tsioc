import { isDefined, PromiseUtil } from '@tsdi/ioc';
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
export abstract class TransformActivity<T = ITransform> extends NodeActivity<T> {


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
    async pipeStream(ctx: NodeActivityContext, stream: ITransform, transform: Expression<ITransform>, waitend = false): Promise<ITransform> {

        let transPipe: ITransform;
        if (isTransform(transform)) {
            transPipe = transform as ITransform;
        } else {
            transPipe = await ctx.resolveExpression(transform);
        }

        let next: ITransform = stream.pipe(transPipe);
        next.once('error', err => {
            console.error(err);
            if (isDefined(process)) {
                process.exit(1);
            }
            throw err;
        });
        if (waitend) {
            let defer = PromiseUtil.defer();
            next.once('end', defer.resolve);
            await defer.promise;
        }
        return next;
    }
}
