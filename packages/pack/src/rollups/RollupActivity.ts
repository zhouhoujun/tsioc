import { NodeActivityContext, NodeActivity } from '../core';
import { Input } from '@tsdi/boot';
import { Expression, TemplateOption, Task } from '@tsdi/activities';
import { RollupFileOptions, rollup, WatcherOptions, watch, PluginImpl, RollupDirOptions } from 'rollup';
// import { rollupClassAnnotations, AnnOptions } from '@tsdi/annotations';
// import { isBoolean } from '@tsdi/ioc';
// import * as typescript from 'typescript';
// import * as ts from 'rollup-plugin-typescript';
// import { SourceFile, TransformerFactory, LanguageService, CustomTransformers } from 'typescript';

export interface RollupOption extends TemplateOption {
    options: Expression<RollupFileOptions | RollupDirOptions>;
    watch?: Expression<WatcherOptions>;
    // annoation?: Expression<boolean>;
    // ts?: Expression<ITsOptions>;
}

@Task('rollup')
export class RollupActivity extends NodeActivity<void> {

    @Input()
    options: Expression<RollupFileOptions | RollupDirOptions>;

    @Input()
    watch: Expression<WatcherOptions>;


    // @Input()
    // annoation: Expression<boolean | AnnOptions>;

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let fopts = await this.resolveExpression(this.options, ctx);
        // if (this.tsOptions) {
        //     let tsOption = await this.resolveExpression(this.tsOptions, ctx);
        //     fopts.plugins = fopts.plugins || [];
        //     fopts.plugins.unshift(ts(tsOption));
        //     let annoation = await this.resolveExpression(this.annoation, ctx);
        //     if (annoation) {
        //         fopts.plugins.unshift(rollupClassAnnotations(isBoolean(annoation) ? null : annoation));
        //     }
        // }
        let bundle = await rollup(fopts as any);
        await bundle.write(fopts.output);
        if (this.watch) {
            let wopts = await this.resolveExpression(this.watch, ctx);
            watch([{
                ...fopts,
                watch: wopts
            }]);
        }
    }
}
