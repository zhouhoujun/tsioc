import { Task, Expression, ValuePipe, ActivityType, Src } from '@tsdi/activities';
import { Input, Binding } from '@tsdi/boot';
import { NodeActivityContext } from '../core';
import { ObjectMap, isString } from '@tsdi/ioc';
import * as ts from 'gulp-typescript';
import { CompilerOptions } from 'typescript';
import { AssetActivityOption, AssetActivity } from './AssetActivity';
import { SourceActivity } from './SourceActivity';
import { DestActivity } from './DestActivity';
import { UglifyActivity } from './UglifyActivity';
import { AnnoationActivity } from './AnnoationActivity';
import { SourceMapActivity } from './SourceMap';
import { StreamActivity } from './StreamActivity';
import { UnitTestActivity } from '../tasks';

/**
 * ts build option.
 *
 * @export
 * @interface TsBuildOption
 * @extends {AssetActivityOption}
 */
export interface TsBuildOption extends AssetActivityOption {
    test?: Binding<Expression<Src>>;
    annotation?: Binding<Expression<boolean>>;
    sourcemaps?: Binding<Expression<string>>;
    tsconfig: Binding<Expression<string | CompilerOptions>>;
    dts?: Binding<Expression<string>>;
    uglify?: Binding<Expression<boolean>>;
    uglifyOptions?: Binding<Expression<any>>;
    jsValuePipe?: Binding<Expression<ValuePipe | boolean>>;
    tdsValuePipe?: Binding<Expression<ValuePipe | boolean>>;
}


@Task('ts')
export class TsBuildActivity extends AssetActivity {


    @Input()
    test: UnitTestActivity;

    @Input('sourcemaps')
    sourceMap: SourceMapActivity;

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

    @Input('tsPipes')
    tsPipes: StreamActivity;

    @Input()
    dts: DestActivity;

    @Input('jsValuePipe')
    jsPipe: ValuePipe;

    @Input('tdsValuePipe')
    tdsPipe: ValuePipe;


    @Input('tsconfig', './tsconfig.json')
    tsconfig: Expression<string | ObjectMap<any>>;

    protected getRunSequence(): ActivityType[] {
        if (this.streamPipes) {
            this.streamPipes.pipe = this.streamPipes.pipe || this.jsPipe;
        }
        if (this.dist) {
            this.dist.pipe = this.dist.pipe || this.jsPipe;
        }
        if (this.dts) {
            this.dts.pipe = this.dts.pipe || this.tdsPipe;
        }
        if (this.sourceMap) {
            this.sourceMap.pipe = this.sourceMap.pipe || this.jsPipe;
        }
        return [
            this.test,
            this.clean,
            this.src,
            this.annotation,
            this.sourceMap,
            this.tsPipes,
            this.promiseLikeToAction<NodeActivityContext>(ctx => this.complieTs(ctx)),
            this.streamPipes,
            this.dts,
            this.uglify,
            this.sourceMap,
            this.dist
        ]
    }

    protected async complieTs(ctx: NodeActivityContext): Promise<void> {
        if (!this.tsconfig) {
            return;
        }
        let tsconfig = await this.resolveExpression(this.tsconfig, ctx);
        let tsCompile;
        if (isString(tsconfig)) {
            let tsProject = ts.createProject(ctx.relativeRoot(tsconfig));
            tsCompile = tsProject();
        } else {
            tsCompile = ts(tsconfig);
        }
        this.result.value = ctx.result = await this.executePipe(ctx, ctx.result, tsCompile);
    }
}
