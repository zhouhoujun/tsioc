import { NodeActivity, NodeActivityContext } from '../core';
import { Task, TemplateOption, Expression, Src, Activities } from '@tsdi/activities';
import { BuilderTypes } from './BuilderTypes';
import { TsBuildOption } from '../transforms';
import { CompilerOptions } from 'typescript';
import { ExternalOption, RollupCache, WatcherOptions, RollupFileOptions, RollupDirOptions } from 'rollup';
import { RollupOption } from '../rollups';


export interface LibTaskOption {
    clean?: Expression<Src>;
    src?: Expression<Src>;
    dist?: Expression<Src>;
    uglify?: Expression<boolean>;
    tsconfig?: Expression<string | CompilerOptions>;

    /**
     * rollup input.
     *
     * @type {Expression<string>}
     * @memberof LibTaskOption
     */
    input?: Expression<string>;
    /**
     * rollup output file.
     *
     * @type {Expression<string>}
     * @memberof LibTaskOption
     */
    outputFile?: Expression<string>;
    /**
     * rollup output dir.
     *
     * @type {Expression<string>}
     * @memberof LibTaskOption
     */
    outputDir?: Expression<string>;
    /**
     * rollup format option.
     *
     * @type {Expression<string>}
     * @memberof LibTaskOption
     */
    format?: Expression<string>;
}

export interface LibPackBuilderOption extends TemplateOption {
    /**
     * tasks
     *
     * @type {(Expression<LibTaskOption|LibTaskOption[]>)}
     * @memberof LibPackBuilderOption
     */
    tasks?: Expression<LibTaskOption | LibTaskOption[]>;
    /**
     * rollup external setting.
     *
     * @type {Expression<ExternalOption>}
     * @memberof RollupOption
     */
    external?: Expression<ExternalOption>;
    /**
     * rollup plugins setting.
     *
     * @type {Expression<Plugin[]>}
     * @memberof RollupOption
     */
    plugins?: Expression<Plugin[]>;

    cache?: Expression<RollupCache>;
    watch?: Expression<WatcherOptions>;
    /**
     * custom setup rollup options.
     *
     * @type {(Expression<RollupFileOptions | RollupDirOptions>)}
     * @memberof RollupOption
     */
    options?: Expression<RollupFileOptions | RollupDirOptions>;
}

@Task({
    selector: BuilderTypes.libs,
    template: {
        activity: 'each',
        each: ctx => ctx.body.each,
        body: [
            {
                activity: 'if',
                condition: ctx => ctx.body.src,
                body: <TsBuildOption>{
                    activity: 'ts',
                    clean: ctx => ctx.body.clean,
                    src: ctx => ctx.body.src,
                    test:  ctx => ctx.body.test,
                    uglify: ctx => ctx.body.uglify,
                    dist: ctx => ctx.body.dist,
                    annotation: true,
                    sourcemaps: './sourcemaps',
                    tsconfig: ctx => ctx.body.tsconfig
                }
            },
            {
                activity: Activities.if,
                condition: ctx => ctx.body.input,
                body: <RollupOption>{
                    activity: 'rollup',
                    input: ctx => ctx.body.input,
                    plugins: ctx => ctx.body.plugins,
                    external: ctx => ctx.body.external,
                    output: ctx => {
                        return {
                            format: ctx.body.format || 'cjs',
                            file: ctx.body.outputFile,
                            dir: ctx.body.outputDir,
                            globals: ctx.body.globals
                        }
                    }
                }
            }
        ]
    }
})
export class LibPackBuilder {

    // protected execute(ctx: NodeActivityContext): Promise<void> {

    // }

}
