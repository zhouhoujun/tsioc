import { Input } from '@tsdi/boot';
import { Expression, Task } from '@tsdi/activities';
import { NodeActivityContext } from '../core';
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

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let sourcemap = await this.resolveExpression(this.sourcemaps, ctx);
        if (sourcemap) {
            if (!this.framework) {
                this.framework = require('gulp-sourcemaps');
            }
            if (!this.framework) {
                console.error('not found gulp-sourcemaps');
                return;
            }
            if (!this.inited) {
                this.result.value = await this.executePipe(ctx, this.result.value, this.framework.init())
            } else {
                this.result.value = await this.executePipe(ctx, this.result.value, this.framework.write(sourcemap));
                this.inited = false;
            }
        }
    }
}
