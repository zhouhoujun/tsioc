import { UglifyCompilerToken, AnnotationCompilerToken, SourceCompilerToken, SourcemapsCompilerToken, TestCompilerToken, AssetBuildHanlde, BuildHandleContext } from '../core';
import { Asset } from '../decorators/Asset';
import { Providers } from '@ts-ioc/core';
import { ShellUglifyActivity } from './compile';
import { Src } from '@ts-ioc/activities';
import { ShellAssetToken } from './IShellAssetActivity';

@Asset(ShellAssetToken)
@Providers([
    { provide: UglifyCompilerToken, useClass: ShellUglifyActivity },
    // { provide: AnnotationCompilerToken, useClass: AnnotationActivity },
    // { provide: SourceCompilerToken, useClass: SourceActivity },
    // { provide: SourcemapsCompilerToken, useClass: SourceMapsActivity },
    // { provide: TestCompilerToken, useClass: MochaTestActivity }
])
export class ShellAssetActivity extends AssetBuildHanlde<BuildHandleContext<Src>> {

}
