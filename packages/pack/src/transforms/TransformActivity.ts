import { isDefined, Singleton, PromiseUtil, Defer } from '@tsdi/ioc';
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
            let defer = PromiseUtil.defer();
            transPipe
                .once('end', defer.resolve)
                .once('error', defer.reject);

            await defer.promise
                .catch(err => {
                    console.error(err);
                    if (isDefined(process)) {
                        process.exit(1);
                    }
                    throw err;
                });
        } else {
            transPipe.once('error', err => {
                console.error(err);
                if (isDefined(process)) {
                    process.exit(1);
                }
                throw err;
            });
        }
        return next;
    }
}
