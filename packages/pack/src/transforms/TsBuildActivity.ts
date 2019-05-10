import { Task, Expression, ValuePipe } from '@tsdi/activities';
import { Input } from '@tsdi/boot';
import { NodeActivityContext } from '../core';
import { ObjectMap, isString } from '@tsdi/ioc';
import * as ts from 'gulp-typescript';
import { TypeScriptJsPipe, TypeScriptTdsPipe } from './TsPipe';
import { AssetActivityOption, AssetActivity } from './AssetActivity';
import { SourceActivity } from './SourceActivity';
import { DestActivity } from './DestActivity';
import { UglifyActivity } from './UglifyActivity';
import { AnnoationActivity } from './AnnoationActivity';

/**
 * ts build option.
 *
 * @export
 * @interface TsBuildOption
 * @extends {AssetActivityOption}
 */
export interface TsBuildOption extends AssetActivityOption {
    annotation?: Expression<boolean>;
    sourceMaps?: Expression<string>;
    tsconfig: Expression<string | ObjectMap<any>>;
    dts?: Expression<string>;
    uglify?: Expression<boolean>;
    uglifyOptions?: Expression<any>;
    jsValuePipe?: ValuePipe;
    tdsValuePipe?: ValuePipe;
}


@Task('ts')
export class TsBuildActivity extends AssetActivity {

    @Input('sourceMaps', './sourcemaps')
    sourceMapPath: string;

    @Input()
    annotation: AnnoationActivity;

    @Input()
    uglify: UglifyActivity;
    /**
     * assert src.
     *
     * @type {Expression<Src>}
     * @memberof AssetActivity
     */
    @Input('src', 'src/**/*.ts')
    src: SourceActivity;

    @Input()
    dts: DestActivity;

    @Input('jsValuePipe', TypeScriptJsPipe)
    jsPipe: ValuePipe;

    @Input('tdsValuePipe', TypeScriptTdsPipe)
    tdsPipe: ValuePipe;


    @Input('tsconfig', './tsconfig.json')
    tsconfig: Expression<string | ObjectMap<any>>;


    protected async startSource(ctx: NodeActivityContext): Promise<void> {
        await super.startSource(ctx);
        if (this.annotation) {
            await this.annotation.run(ctx);
        }
        if (this.tsconfig) {
            let tsconfig = await this.resolveExpression(this.tsconfig, ctx);
            let tsCompile;
            if (isString(tsconfig)) {
                let tsProject = ts.createProject(ctx.relativeRoot(tsconfig));
                tsCompile = tsProject();
            } else {
                tsCompile = ts(tsconfig);
            }
            this.result.value = await this.executePipe(ctx, this.result.value, tsCompile);
        }
    }

    protected async startPipe(ctx: NodeActivityContext): Promise<void> {
        if (this.pipes) {
            this.pipes.pipe = this.pipes.pipe || this.jsPipe;
            await this.pipes.run(ctx);
        }
    }

    protected async startDest(ctx: NodeActivityContext): Promise<void> {
        if (this.dist) {
            this.dist.pipe = this.dist.pipe || this.jsPipe;
            await this.dist.run(ctx);
        }
        if (this.dts) {
            this.dts.pipe = this.dts.pipe || this.tdsPipe;
            await this.dts.run(ctx);
        }
    }

}
