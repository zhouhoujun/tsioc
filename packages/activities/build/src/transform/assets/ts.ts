import { isBoolean, ObjectMap, isString, Providers } from '@ts-ioc/core';
import * as ts from 'gulp-typescript';
import { CtxType, OnActivityInit, Task } from '@taskfr/core';
import { DestActivity, DestAcitvityToken, ITransform, TransformContext, isTransform, ITransformConfigure, TransformActivity } from '../core';
import { AssetConfigure, CompilerToken, InjectCompilerToken, InjectAssetToken } from '../../core';
import { Asset } from '../../decorators';
import { StreamAssetActivity } from '../AssetActivity';


/**
 * ts task configure.
 *
 * @export
 * @interface TsConfigure
 * @extends {AssetConfigure}
 */
export interface TsConfigure extends AssetConfigure, ITransformConfigure {
    /**
     * tds config.
     *
     * @type {(CtxType<boolean | string>)}
     * @memberof TsConfigure
     */
    tds?: CtxType<boolean | string>;

    /**
     * set tsconfig to compile.
     *
     * @type {(CtxType<string | ObjectMap<any>>)}
     * @memberof TsConfigure
     */
    tsconfig?: CtxType<string | ObjectMap<any>>;
}

export const TsCompileToken = new InjectAssetToken('ts');


@Task
export class TsCompiler extends TransformActivity {

    /**
     * execute ts pipe.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof TsCompile
     */
    protected async pipe(): Promise<void> {
        this.context.result.js = await this.pipeStream(this.context.result.js, ...this.pipes);
    }
    /**
     * begin pipe.
     *
     * @protected
     * @returns {Promise<ITransform>}
     * @memberof TsCompile
     */
    protected async beforePipe(): Promise<void> {
        await super.beforePipe();
        this.context.result = await this.executePipe(this.context.result, this.getTsCompilePipe());
    }
    /**
     * get ts configue compile.
     *
     * @private
     * @returns {ITransform}
     * @memberof TsCompile
     */
    private getTsCompilePipe(): ITransform {
        let cfg = this.config as TsConfigure;
        let tsconfig = this.context.to(cfg.tsconfig || './tsconfig.json');
        if (isString(tsconfig)) {
            let tsProject = ts.createProject(this.context.toRootPath(tsconfig));
            return tsProject();
        } else {
            return ts(tsconfig);
        }
    }
}


/**
 * ts file compile.
 *
 * @export
 * @class TsCompile
 * @extends {AssetActivity}
 * @implements {OnActivityInit}
 */
@Asset(TsCompileToken)
@Providers([
    { provide: CompilerToken, useClass: TsCompiler }
])
export class TsCompile extends StreamAssetActivity implements OnActivityInit {

    /**
     * tds dest.
     *
     * @type {(DestActivity | boolean)}
     * @memberof TsCompile
     */
    tdsDest: DestActivity | boolean;

    /**
     * on task init.
     *
     * @param {TsConfigure} cfg
     * @memberof TsCompile
     */
    async onActivityInit(cfg: TsConfigure) {
        if (!cfg.sourcemaps && cfg.sourcemaps !== false) {
            cfg.sourcemaps = true;
        }
        await super.onActivityInit(cfg);
        let tds = this.context.to(cfg.tds);
        if (tds !== false) {
            if (isString(tds)) {
                this.tdsDest = this.container.resolve(DestAcitvityToken);
                this.tdsDest.dest = tds;
            } else {
                this.tdsDest = true;
            }
        }
    }

    /**
     * execyte uglify.
     *
     * @protected
     * @returns
     * @memberof TsCompile
     */
    protected async execUglify(ctx: TransformContext) {
        if (this.uglify) {
            let ugCtx = this.createContext(ctx.result.js);
            await this.uglify.run(ugCtx);
            ctx.result.js = ugCtx.result;
        }
    }
    /**
     * execute dest activity.
     *
     * @protected
     * @param {DestActivity} ds
     * @returns
     * @memberof TsCompile
     */
    protected async execDest(ds: DestActivity, ctx: TransformContext) {
        if (!ds || !this.context.result) {
            return;
        }

        let stream = this.context.result;
        if (this.tdsDest && isTransform(stream.dts)) {
            let dts = isBoolean(this.tdsDest) ? ds : (this.tdsDest || ds);
            await dts.run(this.createContext(stream.dts));
        }
        if (isTransform(stream.js)) {
            let jsCtx = this.createContext(stream.js) as TransformContext;
            jsCtx.sourceMaps = this.context.sourceMaps;
            await ds.run(jsCtx);
        } else if (isTransform(stream)) {
            let newCtx = this.createContext(stream) as TransformContext;
            newCtx.sourceMaps = this.context.sourceMaps;
            await ds.run(newCtx);
        }
    }
}
