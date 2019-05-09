import { Task, Expression } from '@tsdi/activities';
import { Input } from '@tsdi/boot';
import { NodeActivityContext } from '../core';
import {
    AssetActivity, SourceActivity, DestActivity, AssetActivityOption,
    AnnoationActivity, UglifyActivity
} from '../tasks';
import { ObjectMap, isString } from '@tsdi/ioc';
import * as ts from 'gulp-typescript';

export interface TsBuildOption extends AssetActivityOption {
    annotation?: Expression<boolean>;
    sourceMaps?: Expression<string>;
    uglify?: Expression<boolean>;
    uglifyOptions?: Expression<any>;
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

    protected async startDest(ctx: NodeActivityContext): Promise<void> {
        if (this.dist) {
            await this.dist.run(ctx);
        }
        if (this.dts) {
            await this.dts.run(ctx);
        }
    }

}
