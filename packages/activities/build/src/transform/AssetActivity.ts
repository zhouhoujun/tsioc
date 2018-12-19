import { Providers, Token } from '@ts-ioc/core';
import {
    UglifyCompilerToken, AssetActivity, AnnotationCompilerToken,
    SourceCompilerToken, SourcemapsCompilerToken, TestCompilerToken, ICompiler, BuildHandleContext, BuidActivityContext
} from '../core';
import { Asset } from '../decorators';
import { StreamUglifyActivity, AnnotationActivity, SourceActivity, SourceMapsActivity, MochaTestActivity, TransformContext, TransformContextToken } from './core';
import { IActivity, ActivityContextToken } from '@taskfr/core';
import { StreamAssetToken } from './StreamAssetConfigure';


/**
 * Asset Activity
 *
 * @export
 * @class AssetActivity
 * @extends {TaskElement}
 * @implements {IAssetActivity}
 */
@Asset(StreamAssetToken)
@Providers([
    { provide: UglifyCompilerToken, useClass: StreamUglifyActivity },
    { provide: AnnotationCompilerToken, useClass: AnnotationActivity },
    { provide: SourceCompilerToken, useClass: SourceActivity },
    { provide: SourcemapsCompilerToken, useClass: SourceMapsActivity },
    { provide: TestCompilerToken, useClass: MochaTestActivity },
    { provide: ActivityContextToken, useExisting: TransformContextToken }
])
export class StreamAssetActivity extends AssetActivity {
    constructor() {
        super();
    }

    /**
    * create context.
    *
    * @param {*} [data]
    * @param {Token<IActivity>} [type]
    * @param {Token<any>} [defCtx]
    * @returns {TransformContext}
    * @memberof StreamActivity
    */
    createContext(data?: any, type?: Token<IActivity>, defCtx?: Token<any>): TransformContext {
        let context = super.createContext(data, type, defCtx) as TransformContext;
        if (this.context) {
            context.builder = this.context.builder;
            context.origin = this.context.origin;
            context.handle = this.context.handle;
        }
        return context;
    }

    protected verifyCtx(ctx?: any) {
        if (ctx instanceof TransformContext) {
            this.context = ctx;
        } else {
            this.setResult(ctx);
            if (ctx instanceof BuidActivityContext) {
                this.context.builder = ctx.builder;
                this.context.origin = this;
                this.context.handle = this;
            } else if (ctx instanceof BuildHandleContext) {
                this.context.builder = ctx.builder;
                this.context.origin = ctx.origin;
                this.context.handle = ctx.handle;
            }
        }
    }


    protected async compile(ctx: TransformContext): Promise<void> {
        await super.compile(ctx);
    }

    /**
     * execute uglify.
     *
     * @protected
     * @param {TransformActivityContext} ctx
     * @returns
     * @memberof AssetActivity
     */
    protected async execUglify(ctx: TransformContext) {
        await this.execActivity(this.uglify, ctx);
    }

    /**
     * execute dest activity.
     *
     * @protected
     * @param {DestActivity} ds
     * @param {TransformActivityContext} ctx
     * @returns
     * @memberof AssetActivity
     */
    protected async execDest(ds: ICompiler, ctx: TransformContext) {
        await this.execActivity(ds, ctx);
    }
}
