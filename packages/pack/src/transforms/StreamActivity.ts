import { Input } from '@tsdi/components';
import { Task, Expression } from '@tsdi/activities';
import { ITransform } from '../ITransform';
import { NodeActivityContext } from '../NodeActivityContext';
import { TransformService, TransformActivity } from './TransformActivity';

@Task('pipes, [pipes]')
export class StreamActivity extends TransformActivity {

    @Input('pipes') protected pipes: Expression<ITransform>[];

    async execute(ctx: NodeActivityContext): Promise<ITransform> {
        let pipes = await ctx.resolveExpression(this.pipes);
        if (pipes && pipes.length) {
            return await this.pipeStream(ctx, ctx.output, ...pipes);
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
