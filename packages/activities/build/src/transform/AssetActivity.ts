import { Providers, Token } from '@ts-ioc/core';
import {
    UglifyCompilerToken, AnnotationCompilerToken, AssetToken,
    SourceCompilerToken, SourcemapsCompilerToken, TestCompilerToken,
    BuildHandleContext, BuidActivityContext, DestCompilerToken, AssetBuildHanlde, CompilerToken
} from '../core';
import { Asset } from '../decorators';
import {
    StreamUglifyActivity, AnnotationActivity, SourceActivity, TransformContextToken,
    SourceMapsActivity, MochaTestActivity, TransformContext, DestActivity, TransformActivityToken
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
    { provide: DestCompilerToken, useClass: DestActivity },
    { provide: CompilerToken, useExisting: TransformActivityToken }
])
export class AssetActivity extends AssetBuildHanlde<TransformContext> {

    protected isValidContext(ctx: any): boolean {
        return ctx instanceof TransformContext;
    }

    protected setResult(ctx?: any) {
        super.setResult(ctx);
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
