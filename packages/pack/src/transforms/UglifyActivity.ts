import { PipeActivity } from './PipeActivity';
import { Task, Expression } from '@tsdi/activities';
import { NodeActivityContext } from '../core';
import { Input } from '@tsdi/boot';
const uglify = require('gulp-uglify');

@Task('uglify, [uglify]')
export class UglifyActivity extends PipeActivity {

    @Input('uglifyOptions')
    options: Expression<any>;

    @Input()
    uglify: Expression<boolean>;

    constructor(@Input() uglify: Expression<boolean>) {
        super();
        this.uglify = uglify;
    }

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let enable = await this.resolveExpression(this.uglify, ctx);
        if (enable) {
            let options = await this.resolveExpression(this.options, ctx);
            this.result.value = await this.executePipe(ctx, this.result.value, options ? uglify(options) : uglify);
        }
    }
}
