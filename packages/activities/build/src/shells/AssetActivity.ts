// import { AssetActivity, InjectAssetToken, UglifyCompilerToken, AnnotationCompilerToken, SourceCompilerToken, SourcemapsCompilerToken, TestCompilerToken } from '../core';
// import { Asset } from '../decorators';
// import { Providers } from '@ts-ioc/core';
// import { ShellUglifyActivity } from './compile';

// export const ShellAssetToken = new InjectAssetToken('shell-asset');

// @Asset(ShellAssetToken)
// @Providers([
//     { provide: UglifyCompilerToken, useClass: ShellUglifyActivity },
//     { provide: AnnotationCompilerToken, useClass: AnnotationActivity },
//     { provide: SourceCompilerToken, useClass: SourceActivity },
//     { provide: SourcemapsCompilerToken, useClass: SourceMapsActivity },
//     { provide: TestCompilerToken, useClass: MochaTestActivity }
// ])
// export class ShellAssetActivity extends AssetActivity {

// }
