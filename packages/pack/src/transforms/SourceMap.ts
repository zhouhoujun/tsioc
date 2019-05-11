import { Input } from '@tsdi/boot';
import { Expression, Task } from '@tsdi/activities';
import { NodeActivityContext, ITransform } from '../core';
import { PipeActivity } from './PipeActivity';


@Task('[sourcemaps]')
export class SourceMapActivity extends PipeActivity {

    @Input('sourceMapFramework')
    framework: any;

    private inited: boolean;

    constructor(@Input() private sourcemaps: Expression<string>) {
        super()
        this.inited = false;
    }

    async init(ctx: NodeActivityContext, stream: ITransform) {
        if (this.sourcemaps) {
            if (!this.framework) {
                this.framework = require('gulp-sourcemaps');
            }
            await this.executePipe(ctx, stream, this.framework.init());
            this.inited = true;
        }
    }

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let sourcemap = await this.resolveExpression(this.sourcemaps, ctx);
        if (sourcemap) {
            await this.executePipe(ctx, ctx.result, this.framework.write(sourcemap));
            this.inited = false;
        }
        this.result.value = null;
    }
}
