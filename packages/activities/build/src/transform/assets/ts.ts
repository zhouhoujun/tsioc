import { isBoolean, ObjectMap, isString } from '@ts-ioc/core';
import { classAnnotations } from '@ts-ioc/annotations';
import * as ts from 'gulp-typescript';
import { CtxType, OnActivityInit } from '@taskfr/core';
import {
    AssetConfigure, AssetActivity, DestActivity, AnnotationActivity,
    DestAcitvityToken, ITransform, TransformContext, isTransform, InjectAssetActivityToken
} from '../core';
import { Asset } from '../decorators';


/**
 * ts task configure.
 *
 * @export
 * @interface TsConfigure
 * @extends {AssetConfigure}
 */
export interface TsConfigure extends AssetConfigure {
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

/**
 * ts compile token.
 */
export const TsCompileToken = new InjectAssetActivityToken('ts');

/**
 * ts file compile.
 *
 * @export
 * @class TsCompile
 * @extends {AssetActivity}
 * @implements {OnActivityInit}
 */
@Asset(TsCompileToken)
export class TsCompile extends AssetActivity implements OnActivityInit {

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
        await super.onActivityInit(cfg);
        this.defaultAnnotation = { annotationFramework: () => classAnnotations(), task: AnnotationActivity };
        let tds = this.context.to(cfg.tds);
        if (tds !== false) {
            if (isString(tds)) {
                this.tdsDest = this.container.resolve(DestAcitvityToken);
                this.tdsDest.dest = tds;
            } else {
                this.tdsDest = true;
            }
        }
        if (!cfg.sourcemaps && cfg.sourcemaps !== false) {
            cfg.sourcemaps = true;
        }
    }

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
    /**
     * execyte uglify.
     *
     * @protected
     * @returns
     * @memberof TsCompile
     */
    protected async executeUglify() {
        if (this.uglify) {
            let ugCtx = this.createContext(this.context.result.js);
            await this.uglify.run(ugCtx);
            this.context.result.js = ugCtx.result;
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
    protected async executeDest(ds: DestActivity) {
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
