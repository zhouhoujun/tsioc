import { Activity, GActivityType, Input, Task } from '@tsdi/activities';
import { ITransform, NodeActivityContext, isTransform } from '../core';
import { Inject, isUndefined } from '@tsdi/ioc';
import { ContainerToken, IContainer } from '@tsdi/core';


@Task('[pipes]')
export class StreamActivity extends Activity<ITransform> {

    constructor(
        @Inject('[pipes]') protected pipes: GActivityType<ITransform>[],
        @Inject(ContainerToken) container: IContainer) {
        super(container)

    }

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        if (isTransform(ctx.data)) {
            this.result.value = ctx.data;
        }
        if (this.pipes && this.pipes.length) {
            await this.pipeStream(ctx, this.result.value, ...this.pipes);
        }
    }

    /**
     * stream pipe transform.
     *
     * @protected
     * @param {NodeActivityContext} ctx
     * @param {ITransform} stream
     * @param {...GActivityType<ITransform>[]} pipes
     * @returns {Promise<ITransform>}
     * @memberof StreamActivity
     */
    protected async pipeStream(ctx: NodeActivityContext, stream: ITransform, ...pipes: GActivityType<ITransform>[]): Promise<ITransform> {
        if (pipes.length < 1) {
            return stream;
        }

        if (pipes.length === 1) {
            return await this.executePipe(ctx, stream, pipes[0]);
        }

        let pstream = Promise.resolve(stream);
        pipes.forEach(transform => {
            if (transform) {
                pstream = pstream
                    .then(stm => {
                        return this.executePipe(ctx, stm, transform);
                    });
            }
        });
        return await pstream;
    }

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
    protected async executePipe(ctx: NodeActivityContext, stream: ITransform, transform: GActivityType<ITransform>, waitend = false): Promise<ITransform> {
        let next: ITransform;
        await this.execActivity(ctx, transform);
        let transPipe = ctx.data;
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
