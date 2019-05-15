import { Task, TemplateOption, Expression, Src, Activities } from '@tsdi/activities';
import { BuilderTypes } from './BuilderTypes';
import { TsBuildOption } from '../transforms';
import { CompilerOptions } from 'typescript';
import { ExternalOption, RollupCache, WatcherOptions, RollupFileOptions, RollupDirOptions } from 'rollup';
import { RollupOption } from '../rollups';
import { Input, AfterInit, Binding } from '@tsdi/boot';


export interface LibTaskOption {
    clean?: Binding<Expression<Src>>;
    src?: Binding<Expression<Src>>;
    dist?: Binding<Expression<Src>>;
    uglify?: Binding<Expression<boolean>>;
    tsconfig?: Binding<Expression<string | CompilerOptions>>;

    /**
     * rollup input.
     *
     * @type {Binding<Expression<string>>}
     * @memberof LibTaskOption
     */
    input?: Binding<Expression<string>>;
    /**
     * rollup output file.
     *
     * @type {Binding<string>}
     * @memberof LibTaskOption
     */
    outputFile?: Binding<Expression<string>>;
    /**
     * rollup output dir.
     *
     * @type {Binding<string>}
     * @memberof LibTaskOption
     */
    outputDir?: Binding<Expression<string>>;
    /**
     * rollup format option.
     *
     * @type {Binding<string>}
     * @memberof LibTaskOption
     */
    format?: Binding<Expression<string>>;
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
        each: ctx => ctx.scope.tasks,
        body: [
            {
                activity: 'if',
                condition: ctx => ctx.body.src,
                body: <TsBuildOption>{
                    activity: 'ts',
                    clean: ctx => ctx.body.clean,
                    src: ctx => ctx.body.src,
                    test: ctx => ctx.body.test,
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
                    plugins: 'binding: plugins',
                    external: 'binding: external',
                    options: 'binding: options',
                    output: ctx => {
                        return {
                            format: ctx.body.format || 'cjs',
                            file: ctx.body.outputFile,
                            dir: ctx.body.outputDir,
                            globals: ctx.scope.globals
                        }
                    }
                }
            }
        ]
    }
})
export class LibPackBuilder implements AfterInit {

    /**
     * tasks
     *
     * @type {(Expression<LibTaskOption|LibTaskOption[]>)}
     * @memberof LibPackBuilderOption
     */
    @Input()
    tasks: Expression<LibTaskOption | LibTaskOption[]>;
    /**
     * rollup external setting.
     *
     * @type {Expression<ExternalOption>}
     * @memberof RollupOption
     */
    @Input()
    external?: Expression<ExternalOption>;
    /**
     * rollup plugins setting.
     *
     * @type {Expression<Plugin[]>}
     * @memberof RollupOption
     */
    @Input()
    plugins?: Expression<Plugin[]>;

    @Input()
    cache?: Expression<RollupCache>;

    @Input()
    watch?: Expression<WatcherOptions>;
    /**
     * custom setup rollup options.
     *
     * @type {(Expression<RollupFileOptions | RollupDirOptions>)}
     * @memberof RollupOption
     */
    @Input()
    options?: Expression<RollupFileOptions | RollupDirOptions>;


    async onAfterInit(): Promise<void> {

    }

}
