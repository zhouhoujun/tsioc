import { isBoolean, ObjectMap, isString, Providers, lang } from '@ts-ioc/core';
import * as ts from 'gulp-typescript';
import { CtxType, OnActivityInit, Task } from '@taskfr/core';
import {
    ITransform, TransformContext,
    isTransform, ITransformConfigure, TransformActivity, TransformType
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
    protected async pipe(...pipes: TransformType[]): Promise<void> {
        this.context.result.js = await this.pipeStream(this.context.result.js, ...pipes);
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
     * on task init.
     *
     * @param {TsConfigure} cfg
     * @memberof TsCompile
     */
    async onActivityInit(cfg: TsConfigure) {
        if (!cfg.sourcemaps && cfg.sourcemaps !== false) {
            cfg.sourcemaps = true;
        }
        if (cfg.tds !== false) {
            cfg.tds = true;
        }
        await super.onActivityInit(cfg);
    }

    /**
     * execyte uglify.
     *
     * @protected
     * @returns
     * @memberof TsCompile
     */
    protected async execUglify(ctx: TransformContext) {
        let ugCtx = this.createContext(ctx.result.js) as TransformContext;
        await super.execUglify(ugCtx);
        ctx.result.js = ugCtx.result;
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
        let config = ctx.config as TsConfigure;
        if (isTransform(stream.dts)) {
            if (config.tds) {
                let tdsDest = await this.toActivity<string | boolean, IDestCompiler, DestConfigure>(config.tds,
                    act => act instanceof CompilerActivity,
                    dest => {
                        if (isBoolean(dest)) {
                            if (dest) {
                                return { activity: DestCompilerToken };
                            }
                        } else if (isString(dest)) {
                            return { dest: dest, activity: DestCompilerToken };
                        }
                        return null;
                    });
                await this.execActivity(tdsDest, this.createContext(stream.dts));
            }
        }
        if (isTransform(stream.js)) {
            let jsCtx = this.createContext(stream.js) as TransformContext;
            jsCtx.config = ctx.config;
            await super.execDest(jsCtx);
        } else if (isTransform(stream)) {
            let newCtx = this.createContext(stream) as TransformContext;
            newCtx.config = ctx.config;
            await super.execDest(newCtx);
        }
    }
}
