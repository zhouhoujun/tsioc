import { Task, Expression } from '@tsdi/activities';
import { ITransform, NodeActivityContext, isTransform } from '../core';
import { Input } from '@tsdi/boot';
import { PipeActivity } from './PipeActivity';


@Task('[pipes]')
export class StreamActivity extends PipeActivity {

    constructor(@Input() protected pipes: Expression<ITransform>[]) {
        super()

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
     * @param {...Expression<ITransform>[]} pipes
     * @returns {Promise<ITransform>}
     * @memberof StreamActivity
     */
    protected async pipeStream(ctx: NodeActivityContext, stream: ITransform, ...pipes: Expression<ITransform>[]): Promise<ITransform> {
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

}
