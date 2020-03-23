import { ObjectMap, isString } from '@tsdi/ioc';
import { Input, Binding } from '@tsdi/components';
import { Task, Src, Activities, ActivityType } from '@tsdi/activities';
import { CompilerOptions } from 'typescript';
import { AssetActivityOption, AssetActivity } from './AssetActivity';
import { NodeActivityContext } from '../NodeActivityContext';
import { ITransform, isTransform } from '../ITransform';
const sourcemaps = require('gulp-sourcemaps');
const ts = require('gulp-typescript');
// import * as through from 'through2';
// import { TsComplie } from '../ts-complie';
// import * as VFile from 'vinyl';
// import { tsFileExp } from '../exps';
// const rename = require('gulp-rename');
// const applySourceMap = require('vinyl-sourcemaps-apply');


/**
 * ts build option.
 *
 * @export
 * @interface TsBuildOption
 * @extends {AssetActivityOption}
 */
export interface TsBuildOption extends AssetActivityOption {
    test?: Binding<Src>;
    annotation?: Binding<boolean>;
    tsconfig?: Binding<string | CompilerOptions>;
    dts?: Binding<string>;
    uglify?: Binding<boolean>;
    uglifyOptions?: Binding<any>;
}

@Task({
    selector: 'ts',
    template: `
        <src [src]="src"></src>
        <annotation [annotation]="annotation" [framework]="annotationFramework"></annotation>
        <execute *if="sourcemap" name="sourcemap-init" [action]="sourcemapInit(ctx.getData())"></execute>
        <pipes *if="beforePipes" [pipes]="beforePipes"></pipes>
        <execute name="tscompile" [action]="tscompile(ctx)"></execute>
        <sequence [input]="ctx.getData() | tsjs">
            <pipes [pipes]="pipes"></pipes>
            <uglify *if="uglify" [uglifyOptions]="uglifyOptions"></uglify>
            <execute *if="sourcemap" name="sourcemap-write" [action]="sourcemapWrite(ctx.getData())"></execute>
            <dist [dist]="dist"></dist>
        </sequence>
        <dist [input]="ctx.getData() | dts" [dist]="dts"></dist>
    `
})
export class TsBuildActivity extends AssetActivity {
    @Input() dts: string;
    @Input() annotation: boolean;
    @Input('annotationFramework') annotationFramework: ITransform;
    @Input('beforePipes') beforePipes: ActivityType<ITransform>[];
    @Input('tsconfig', './tsconfig.json') tsconfig: string | ObjectMap;
    @Input() uglify: boolean;
    @Input('uglifyOptions') uglifyOptions: any;

    isTransform(stream) {
       return isTransform(stream);
    }

    async tscompile(ctx: NodeActivityContext) {
        if (!this.tsconfig) {
            return;
        }
        let tsconfig = this.tsconfig;
        let tsCompile;
        let dts = this.dts;
        if (isString(tsconfig)) {
            let tsProject = ts.createProject(ctx.platform.relativeRoot(tsconfig), { declaration: !!dts });
            tsCompile = tsProject();
        } else {
            tsconfig.declaration = !!dts;
            let tsProject = ts.createProject(ctx.platform.relativeRoot('./tsconfig.json'), tsconfig);
            tsCompile = tsProject();
        }
        return ctx.getData().pipe(tsCompile);
    }
}

// template: [
//     {
//         activity: 'src',
//         src: 'binding: src',
//     },
//     {
//         activity: 'annotation',
//         annotationFramework: 'binding: annotationFramework',
//         annotation: 'binding: annotation'
//     },
//     {
//         activity: Activities.if,
//         condition: 'binding: sourcemap',
//         body: {
//             name: 'sourcemap-init',
//             activity: Activities.execute,
//             action: (ctx: NodeActivityContext, bind) => {
//                 let scope = bind.getScope<TsBuildActivity>();
//                 let framework = scope.framework || sourcemaps;
//                 return ctx.getData().pipe(framework.init());
//             }
//         }
//     },
//     {
//         activity: Activities.if,
//         condition: (ctx, bind) => bind.getScope<TsBuildActivity>().beforePipes?.length > 0,
//         body: {
//             activity: 'pipes',
//             pipes: 'binding: beforePipes'
//         }
//     },
//     {
//         activity: Activities.execute,
//         name: 'tscompile',
//         action: async (ctx: NodeActivityContext, bind) => {
//             let scope = bind.getScope<TsBuildActivity>();
//             if (!scope.tsconfig) {
//                 return;
//             }
//             let tsconfig = scope.tsconfig;
//             let tsCompile;
//             let dts = scope.dts;
//             if (isString(tsconfig)) {
//                 let tsProject = ts.createProject(ctx.platform.relativeRoot(tsconfig), { declaration: !!dts });
//                 tsCompile = tsProject();
//             } else {
//                 tsconfig.declaration = !!dts;
//                 let tsProject = ts.createProject(ctx.platform.relativeRoot('./tsconfig.json'), tsconfig);
//                 tsCompile = tsProject();
//             }
//             return ctx.getData().pipe(tsCompile);
//         }
//     },
//     {
//         activity: Activities.if,
//         externals: {
//             data: 'ctx.getData() | tsjs'
//         },
//         condition: ctx => isTransform(ctx.getData()),
//         body: [
//             {
//                 activity: 'pipes',
//                 pipes: 'binding: pipes'
//             },
//             {
//                 activity: 'if',
//                 condition: 'binding: uglify',
//                 body: {
//                     activity: 'uglify',
//                     uglifyOptions: 'binding: uglifyOptions'
//                 }
//             },
//             {
//                 activity: Activities.if,
//                 condition: 'binding: sourcemap',
//                 body: {
//                     name: 'sourcemap-write',
//                     activity: Activities.execute,
//                     action: async (ctx: NodeActivityContext, bind) => {
//                         let scope = bind.getScope<TsBuildActivity>();
//                         let framework = scope.framework || sourcemaps;
//                         return ctx.getData<ITransform>().pipe(framework.write(isString(scope.sourcemap) ? scope.sourcemap : './sourcemaps'));
//                     }
//                 }
//             },
//             {
//                 name: 'write-js',
//                 activity: 'dist',
//                 dist: 'binding: dist'
//             }
//         ]
//     },
//     {
//         activity: Activities.if,
//         externals: {
//             data: 'ctx.getData() | dts'
//         },
//         condition: 'binding: dts',
//         body: {
//             name: 'write-dts',
//             activity: 'dist',
//             dist: 'binding: dts'
//         }
//     }
// ]
