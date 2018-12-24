import { Providers, Token, lang } from '@ts-ioc/core';
import {
    UglifyCompilerToken, AnnotationCompilerToken,
    SourceCompilerToken, SourcemapsCompilerToken, TestCompilerToken,
    BuildHandleContext, BuidActivityContext, DestCompilerToken, AssetBuildHanlde, AssetToken
} from '../core';
import { Asset } from '../decorators';
import {
    StreamUglifyActivity, AnnotationActivity, SourceActivity,
    SourceMapsActivity, MochaTestActivity, TransformContext, TransformContextToken, DestActivity
} from './core';
import { IActivity, ActivityContextToken } from '@taskfr/core';

/**
 * Asset Activity
 *
 * @export
 * @class AssetActivity
 * @extends {TaskElement}
 * @implements {IAssetActivity}
 */
@Asset(AssetToken)
@Providers([
    { provide: UglifyCompilerToken, useClass: StreamUglifyActivity },
    { provide: AnnotationCompilerToken, useClass: AnnotationActivity },
    { provide: SourceCompilerToken, useClass: SourceActivity },
    { provide: SourcemapsCompilerToken, useClass: SourceMapsActivity },
    { provide: TestCompilerToken, useClass: MochaTestActivity },
    { provide: ActivityContextToken, useExisting: TransformContextToken },
    { provide: DestCompilerToken, useClass: DestActivity }
])
export class AssetActivity extends AssetBuildHanlde<TransformContext> {

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
        console.log('asset ctx:', lang.getClassName(this), lang.getClassName(context))
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
}
