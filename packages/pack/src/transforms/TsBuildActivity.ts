import { Task, Expression, ValuePipe, ActivityType, Src } from '@tsdi/activities';
import { Input, Binding, AfterInit } from '@tsdi/boot';
import { NodeActivityContext } from '../core';
import { ObjectMap, isString } from '@tsdi/ioc';
import { CompilerOptions } from 'typescript';
import { AssetActivityOption, AssetActivity } from './AssetActivity';
import { SourceActivity } from './SourceActivity';
import { DestActivity } from './DestActivity';
import { UglifyActivity } from './UglifyActivity';
import { AnnoationActivity } from './AnnoationActivity';
import { StreamActivity } from './StreamActivity';
import { UnitTestActivity } from '../tasks';
import { TypeScriptJsPipe, TypeScriptDtsPipe } from './TsPipe';
const ts = require('gulp-typescript');

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
    tsconfig: Binding<Expression<string | CompilerOptions>>;
    dts?: Binding<Expression<string>>;
    uglify?: Binding<Expression<boolean>>;
    uglifyOptions?: Binding<Expression<any>>;
    jsValuePipe?: Binding<Expression<ValuePipe | boolean>>;
    dtsValuePipe?: Binding<Expression<ValuePipe | boolean>>;
}


@Task('ts')
export class TsBuildActivity extends AssetActivity implements AfterInit {


    @Input()
    test: UnitTestActivity;



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

    @Input('dts')
    dts: DestActivity;

    @Input('jsValuePipe')
    jsPipe: ValuePipe;

    @Input('dtsValuePipe')
    tdsPipe: ValuePipe;


    @Input('tsconfig', './tsconfig.json')
    tsconfig: Expression<string | ObjectMap<any>>;


    onAfterInit(): void | Promise<void> {
        this.jsPipe = this.jsPipe || this.getContainer().resolve(TypeScriptJsPipe);
        this.tdsPipe = this.tdsPipe || this.getContainer().resolve(TypeScriptDtsPipe);
        if (this.streamPipes) {
            this.streamPipes.pipe = this.streamPipes.pipe || this.jsPipe;
        }
        if (this.uglify) {
            this.uglify.pipe = this.uglify.pipe || this.jsPipe;
        }
        if (this.dist) {
            this.dist.pipe = this.dist.pipe || this.jsPipe;
        }
        if (this.dts) {
            this.dts.pipe = this.dts.pipe || this.tdsPipe;
        }
        if (this.sourcemapWrite) {
            this.sourcemapWrite.pipe = this.sourcemapWrite.pipe || this.jsPipe;
        }
    }


    protected getRunSequence(): ActivityType[] {

        return [
            this.test,
            this.clean,
            this.src,
            this.annotation,
            this.sourcemapInit,
            this.tsPipes,
            this.promiseLikeToAction<NodeActivityContext>(ctx => this.complieTs(ctx)),
            this.streamPipes,
            this.dts,
            this.uglify,
            this.sourcemapWrite,
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
            let tsProject = ts.createProject(ctx.platform.relativeRoot(tsconfig));
            tsCompile = tsProject();
        } else {
            tsCompile = ts(tsconfig);
        }
        this.result.value = ctx.result = await this.executePipe(ctx, ctx.result, tsCompile);
    }
}
