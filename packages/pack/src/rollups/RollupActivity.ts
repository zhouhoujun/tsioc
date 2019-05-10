import { NodeActivity } from '../core/NodeActivity';
import { NodeActivityContext } from '../core';
import { Input } from '@tsdi/boot';
import { Expression, TemplateOption, Task } from '@tsdi/activities';
import { RollupFileOptions, rollup, WatcherOptions, watch } from 'rollup';
import { rollupClassAnnotations, AnnOptions } from '@tsdi/annotations';
import { isBoolean } from '@tsdi/ioc';
import * as typescript from 'typescript';
import ts from 'rollup-plugin-typescript2';
import { SourceFile, TransformerFactory, LanguageService, CustomTransformers } from 'typescript';

export interface ICustomTransformer {
    before?: TransformerFactory<SourceFile>;
    after?: TransformerFactory<SourceFile>;
}
export declare type TransformerFactoryCreator = (ls: LanguageService) => CustomTransformers | ICustomTransformer;

export interface ITsOptions {
    include?: string | string[];
    exclude?: string | string[];
    check?: boolean;
    verbosity?: number;
    clean?: boolean;
    cacheRoot?: string;
    abortOnError?: boolean;
    rollupCommonJSResolveHack?: boolean;
    tsconfig?: string;
    useTsconfigDeclarationDir?: boolean;
    typescript?: typeof typescript;
    tsconfigOverride?: any;
    transformers?: TransformerFactoryCreator[];
    tsconfigDefaults?: any;
    sourceMapCallback?: (id: string, map: string) => void;
    objectHashIgnoreUnknownHack?: boolean;
}

export interface RollupOption extends TemplateOption {
    options: Expression<RollupFileOptions>;
    watch?: Expression<WatcherOptions>;
    annoation?: Expression<boolean>;
    ts?: Expression<ITsOptions>;
}

@Task('rollup')
export class RollupActivity extends NodeActivity<void> {

    @Input()
    options: Expression<RollupFileOptions>;

    @Input()
    watch: Expression<WatcherOptions>;

    @Input()
    tsOptions: Expression<ITsOptions>;

    @Input()
    annoation: Expression<boolean | AnnOptions>;

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let fopts = await this.resolveExpression(this.options, ctx);
        if (this.tsOptions) {
            let tsOption = await this.resolveExpression(this.tsOptions, ctx);
            fopts.plugins = fopts.plugins || [];
            fopts.plugins.unshift(ts(tsOption));
            let annoation = await this.resolveExpression(this.annoation, ctx);
            if (annoation) {
                fopts.plugins.unshift(rollupClassAnnotations(isBoolean(annoation) ? null : annoation))
            }
        }

        let bundle = await rollup(fopts);
        await bundle.write(fopts.output);
        if (this.watch) {
            let wopts = await this.resolveExpression(this.watch, ctx);
            watch([{
                ...fopts,
                // output: fopts.output,
                watch: wopts
            }]);
        }
    }

}
