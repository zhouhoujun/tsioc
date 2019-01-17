import { Providers } from '@ts-ioc/core';
import {
    UglifyCompilerToken, AnnotationCompilerToken, AssetToken,
    SourceCompilerToken, SourcemapsCompilerToken, TestCompilerToken,
    DestCompilerToken, AssetBuildHanlde, CompilerToken, UnitTestActivity
} from '../core';
import { Asset } from '../decorators/Asset';
import {
    StreamUglifyActivity, AnnotationActivity, SourceActivity, TransformContextToken,
    SourceMapsActivity, TransformContext, DestActivity, TransformActivityToken
} from './core';
import { ActivityContextToken } from '@ts-ioc/activities';

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
    { provide: ActivityContextToken, useExisting: TransformContextToken },
    { provide: DestCompilerToken, useClass: DestActivity },
    { provide: CompilerToken, useExisting: TransformActivityToken }
])
export class AssetActivity extends AssetBuildHanlde<TransformContext> {

}
