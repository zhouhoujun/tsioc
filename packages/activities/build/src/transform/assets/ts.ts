import { isBoolean, ObjectMap, isString, Providers } from '@ts-ioc/core';
import * as ts from 'gulp-typescript';
import { CtxType, OnActivityInit, Task } from '@taskfr/core';
import {
    ITransform, TransformContext,
    isTransform, ITransformConfigure, TransformActivity
} from '../core';
import {
    AssetConfigure, CompilerToken, InjectAssetToken,
    DestCompilerToken, CompilerActivity, DestConfigure, IDestCompiler
} from '../../core';
import { Asset } from '../../decorators';
import { AssetActivity } from '../AssetActivity';


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
        console.log(this.context.constructor.name, this.context.config);
        this.context.result = await this.executePipe(this.context.result, this.getTsCompilePipe(this.context.config));
    }
    /**
     * get ts configue compile.
     *
     * @private
     * @returns {ITransform}
     * @memberof TsCompile
     */
    private getTsCompilePipe(cfg: TsConfigure): ITransform {
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
 * ts compile token.
 */
export const TsCompileToken = new InjectAssetToken('ts');

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
export class TsCompile extends AssetActivity implements OnActivityInit {

    /**
     * tds dest.
     *
     * @type {DestActivity}
     * @memberof TsCompile
     */
    tdsDest: IDestCompiler;

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
        if (cfg.tds !== false) {
            cfg.tds = true;
        }
        if (cfg.tds) {
            let dist = this.dest ? this.dest.getDest() : '';
            this.tdsDest = await this.toActivity<string | boolean, IDestCompiler, DestConfigure>(cfg.tds,
                act => act instanceof CompilerActivity,
                dest => {
                    if (isBoolean(dest)) {
                        if (dest && dist) {
                            return { dest: dist, activity: DestCompilerToken };
                        }
                    } else if (isString(dest)) {
                        return { dest: dest, activity: DestCompilerToken };
                    }
                    return null;
                });
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
    protected async execDest(ctx: TransformContext) {
        if (!ctx.result) {
            return;
        }

        let stream = ctx.result;
        if (isTransform(stream.dts)) {
            await this.execActivity(this.tdsDest, this.createContext(stream.dts));
        }
        if (isTransform(stream.js)) {
            let jsCtx = this.createContext(stream.js) as TransformContext;
            await this.execActivity(this.sourcemaps, jsCtx);
            await this.execActivity(this.dest, jsCtx);
        } else if (isTransform(stream)) {
            let newCtx = this.createContext(stream) as TransformContext;
            await this.execActivity(this.sourcemaps, newCtx);
            await this.execActivity(this.dest, newCtx);
        }
    }
}
