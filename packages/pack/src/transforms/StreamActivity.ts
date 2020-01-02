import { Input } from '@tsdi/components';
import { Task, Expression } from '@tsdi/activities';
import { ITransform, NodeActivityContext } from '../core';
import { TransformService, TransformActivity } from './TransformActivity';

@Task('[pipes]')
export class StreamActivity extends TransformActivity {

    @Input('pipes') protected pipes: Expression<ITransform>[];

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let pipes = await this.resolveExpression(this.pipes, ctx);
        if (pipes && pipes.length) {
            this.result = await this.pipeStream(ctx, this.result, ...pipes);
        }
    }

    /**
     * stream pipe transform.
     *
     * @protected
     * @param {NodeActivityContext} ctx
     * @param {ITransform} stream
     * @param {...Expression<ITransform>[]} pipes
     * @returns {Promise<ITransform>}
     * @memberof StreamActivity
     */
    protected async pipeStream(ctx: NodeActivityContext, stream: ITransform, ...pipes: Expression<ITransform>[]): Promise<ITransform> {
        if (pipes.length < 1) {
            return stream;
        }

        let service = ctx.injector.get(TransformService);
        if (pipes.length === 1) {
            return await service.executePipe(ctx, stream, pipes[0]);
        }

        let pstream = Promise.resolve(stream);
        pipes.forEach(transform => {
            if (transform) {
                pstream = pstream
                    .then(stm => {
                        return service.executePipe(ctx, stm, transform);
                    });
            }
        });
        return await pstream;
    }

}
