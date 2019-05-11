import { Task, Expression, ValuePipe, Activity, ActivityType } from '@tsdi/activities';
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
import { SourceMapActivity } from './SourceMap';
import { StreamActivity } from './StreamActivity';

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

    @Input('sourceMaps')
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

    @Input('jsValuePipe', TypeScriptJsPipe)
    jsPipe: ValuePipe;

    @Input('tdsValuePipe', TypeScriptTdsPipe)
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
        return [
            this.clean,
            this.src,
            this.annotation,
            this.sourceMap ? this.promiseLikeToAction<NodeActivityContext>(ctx => this.sourceMap.init(ctx, this.result.value)) : null,
            this.tsPipes,
            this.promiseLikeToAction<NodeActivityContext>(ctx => this.complieTs(ctx)),
            this.streamPipes,
            this.sourceMap,
            this.dist,
            this.dts
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
