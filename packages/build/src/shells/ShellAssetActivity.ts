import { UglifyCompilerToken, AssetBuildHandle, BuildHandleContext } from '../core';
import { Asset } from '../decorators/Asset';
import { Providers } from '@tsdi/ioc';
import { ShellUglifyActivity } from './compile';
import { Src } from '@tsdi/activities';
import { ShellAssetToken } from './IShellAssetActivity';

@Asset(ShellAssetToken)
@Providers([
    { provide: UglifyCompilerToken, useClass: ShellUglifyActivity },
    // { provide: AnnotationCompilerToken, useClass: AnnotationActivity },
    // { provide: SourceCompilerToken, useClass: SourceActivity },
    // { provide: SourcemapsCompilerToken, useClass: SourceMapsActivity },
    // { provide: TestCompilerToken, useClass: MochaTestActivity }
])
export class ShellAssetActivity extends AssetBuildHandle<BuildHandleContext<Src>> {

}
