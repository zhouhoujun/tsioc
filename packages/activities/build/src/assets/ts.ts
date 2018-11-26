import { isBoolean, ObjectMap, isString } from '@ts-ioc/core';
import { classAnnotations } from '@ts-ioc/annotations';
import * as ts from 'gulp-typescript';
import { CtxType, OnActivityInit } from '@taskfr/core';
import {
    AssetConfigure, Asset, AssetActivity, DestActivity, AnnotationActivity,
    DestAcitvityToken, ITransform, TransformContext, isTransform
} from '../core';


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

@Asset('ts')
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
        let tds = this.getContext().to(cfg.tds);
        if (tds !== false) {
            if (isString(tds)) {
                this.tdsDest = this.getContainer().resolve(DestAcitvityToken);
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
        let ctx = this.getContext();
        ctx.result.js = await this.pipeStream(ctx.result.js, ...this.pipes);
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
        let ctx = this.getContext();
        ctx.result = await this.pipeStream(ctx.result, this.getTsCompilePipe());
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
        let tsconfig = this.getContext().to(cfg.tsconfig || './tsconfig.json');
        if (isString(tsconfig)) {
            let tsProject = ts.createProject(this.getContext().toRootPath(tsconfig));
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
            let ctx = this.getContext();
            let ugCtx = this.getCtxFactory().create<TransformContext>(ctx.result.js);
            await this.uglify.run(ugCtx);
            ctx.result.js = ugCtx.result;
        }
    }
    /**
     * execute dest activity.
     *
     * @protected
     * @param {DestActivity} ds
     * @param {ctx} TransformActivityContext
     * @returns
     * @memberof TsCompile
     */
    protected async executeDest(ds: DestActivity) {
        let ctx = this.getContext();
        if (!ds || !ctx.result) {
            return;
        }

        let stream = ctx.result;
        if (this.tdsDest && isTransform(stream.dts)) {
            let dts = isBoolean(this.tdsDest) ? ds : (this.tdsDest || ds);
            await dts.run(this.getCtxFactory().create<TransformContext>(stream.dts));
        }
        if (isTransform(stream.js)) {
            let jsCtx = this.getCtxFactory().create<TransformContext>(stream.js);
            jsCtx.sourceMaps = ctx.sourceMaps;
            await ds.run(jsCtx);
        } else if (isTransform(stream)) {
            let newCtx = this.getCtxFactory().create<TransformContext>(stream);
            newCtx.sourceMaps = ctx.sourceMaps;
            await ds.run(newCtx);
        }
    }
}
