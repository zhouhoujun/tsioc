import { isArray } from '@tsdi/ioc';
import { AfterInit, Binding, Input } from '@tsdi/components';
import { Task, Activities, ActivityTemplate } from '@tsdi/activities';
import { BuilderTypes } from './BuilderTypes';
import { AssetActivityOption, JsonEditActivityOption } from '../transforms';
import { Plugin } from 'rollup';
import { NodeExpression } from '../NodeActivityContext';
import { LibPackBuilderOption, LibPackBuilder, LibBundleOption } from './LibPackBuilder';
import { RollupOption, RollupTsOption } from '../rollups';
import { tsFileExp } from '../exps';
const rename = require('gulp-rename');
const uglify = require('gulp-uglify-es');

export interface TsLibPackBuilderOption extends LibPackBuilderOption {

    mainFile?: Binding<string>;
    /**
     * before ts compile.
     *
     * @type {Binding<NodeExpression<Plugin[]>>}
     * @memberof TsLibPackBuilderOption
     */
    beforeCompile?: Binding<NodeExpression<Plugin[]>>;
}


/**
 * build ts project by rollup
 *
 * @export
 * @class TsLibPackBuilder
 * @extends {LibPackBuilder}
 * @implements {AfterInit}
 */
@Task({
    selector: 'tslibs',
    template: `
    <clean [clean]="outDir"></clean>
    <test [test]="outDir"></test>
    <asset [src]="['package.json', '*.md']" [test]="outDir"></asset>
    <sequence *each="let input in bundles">
        <rts *if="vaidts(input)" [input]="transRollupInput(input)" [sourcemap]="sourcemap" [plugins]="transPlugins(ctx)" [external]="external"
                [options]="options" [globals]="globals" [output]="transRollupoutput(input)"></rts>
        <rollup *elseif="input" [input]="transRollupInput(input)" [sourcemap]="sourcemap" [plugins]="transPlugins(ctx)" [external]="external"
                [options]="options" [globals]="globals" [output]="transRollupoutput(input)"></rollup>
        <asset *if="input.uglify" [src]="getBundleSrc(input)" [dist]="toModulePath(input)" [sourcemap]="sourcemap | path:'./'" ></asset>
        <asset *if="input.moduleName || input.target" [src]="toOutputPath('package.json')" [dist]="outDir">
            <asset.pipes>
                <jsonEdit [json]="json($event, input)"></jsonEdit>
            </asset.pipes>
        </asset>
    </sequence>
    `
})
export class TsLibPackBuilder extends LibPackBuilder implements AfterInit {

    @Input() mainFile: string;
    @Input() beforeCompile: NodeExpression<Plugin[]>;

    vaidts(input: LibBundleOption) {
        let inputs = input.input || this.mainFile;
        if (inputs) {
            return isArray(inputs) ? inputs.some(i => tsFileExp.test(i)) : tsFileExp.test(inputs)
        }
        return false
    }
}



// template: <ActivityTemplate>[
//     {
//         activity: 'clean',
//         clean: 'binding: outDir'
//     },
//     {
//         activity: 'test',
//         test: 'binding: test',
//     },
//     {
//         activity: 'asset',
//         src: ['package.json', '*.md'],
//         dist: 'binding: outDir'
//     },
//     {
//         activity: 'each',
//         each: 'binding: bundles',
//         body: [
//             {
//                 activity: Activities.if,
//                 condition: 'binding: vaidts(ctx.getInput())',
//                 body: <RollupTsOption>{
//                     activity: 'rts',
//                     input: 'binding: transRollupInput(ctx.getInput())',
//                     sourcemap: 'binding: sourcemap',
//                     plugins: 'binding: transPlugins(ctx)',
//                     external: 'binding: external',
//                     options: 'binding: options',
//                     globals: 'binding: globals',
//                     output: 'binding: transRollupoutput(ctx.getInput())'
//                 }
//             },
//             {
//                 activity: Activities.elseif,
//                 condition: ctx => ctx.getInput<LibBundleOption>().input,
//                 body: <RollupOption>{
//                     activity: 'rollup',
//                     input: 'binding: transRollupInput(ctx.getInput())',
//                     sourcemap: 'binding: sourcemap',
//                     plugins: 'binding: transPlugins(ctx)',
//                     external: 'binding: external',
//                     options: 'binding: options',
//                     globals: 'binding: globals',
//                     output: 'binding: transRollupoutput(ctx.getInput())'
//                 }
//             },
//             {
//                 activity: Activities.if,
//                 condition: ctx => ctx.getInput<LibBundleOption>().uglify,
//                 body: <AssetActivityOption>{
//                     activity: 'asset',
//                     src: 'binding: getBundleSrc(ctx.getInput())',
//                     dist: 'binding: toModulePath(bind.getInput())',
//                     sourcemap: 'binding: sourcemap | path:"./"',
//                     pipes: [
//                         () => uglify(),
//                         () => rename({ suffix: '.min' })
//                     ]
//                 }
//             },

//             {
//                 activity: Activities.if,
//                 condition: ctx => ctx.getInput<LibBundleOption>().moduleName || ctx.getInput<LibBundleOption>().target,
//                 body: <AssetActivityOption>{
//                     activity: 'asset',
//                     src: 'binding: toOutputPath("package.json")',
//                     dist: 'binding: outDir',
//                     pipes: [
//                         <JsonEditActivityOption>{
//                             activity: 'jsonEdit',
//                             json: (json, bind) => {
//                                 let input = bind.getInput<LibBundleOption>();
//                                 let scope = bind.getScope<TsLibPackBuilder>();
//                                 // to replace module export.
//                                 if (input.target) {
//                                     json[input.target] = ['.', scope.getTargetFolder(input), input.main || 'index.js'].join('/');
//                                 }
//                                 let outmain = ['.', scope.getModuleFolder(input), input.outputFile || 'index.js'].join('/');
//                                 if (isArray(input.moduleName)) {
//                                     input.moduleName.forEach(n => {
//                                         json[n] = outmain;
//                                     })
//                                 } else if (input.moduleName) {
//                                     json[input.moduleName] = outmain;
//                                 }
//                                 if (input.dtsMain) {
//                                     json['typings'] = ['.', scope.getTargetFolder(input), input.dtsMain].join('/');
//                                 }
//                                 return json;
//                             }
//                         }
//                     ]
//                 }
//             }
//         ]
//     }
// ]
