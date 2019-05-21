import { NodeActivityContext, NodeActivity, NodeExpression } from '../core';
import { Input, Binding } from '@tsdi/boot';
import { TemplateOption, Task, Src } from '@tsdi/activities';
import {
    RollupFileOptions, rollup, WatcherOptions, RollupDirOptions, RollupCache,
    OutputOptionsFile, OutputOptionsDir, ExternalOption
} from 'rollup';
import { isArray, isNullOrUndefined, isString } from '@tsdi/ioc';
// import { basename } from 'path';
// import { readFileSync } from 'fs';
// const hypothetical = require('rollup-plugin-hypothetical');

/**
 * rollup activity template option.
 *
 * @export
 * @interface RollupOption
 * @extends {TemplateOption}
 */
export interface RollupOption extends TemplateOption {
    /**
     * rollup input setting.
     *
     * @type {Binding<NodeExpression<Src>>}
     * @memberof RollupOption
     */
    input: Binding<NodeExpression<Src>>;

    /**
     * rollup source maps
     *
     * @type {Binding<NodeExpression<boolean>>}
     * @memberof RollupOption
     */
    sourcemap?: Binding<NodeExpression<boolean>>;
    /**
     * rollup output setting.
     *
     * @type {(Binding<NodeExpression<OutputOptionsFile | OutputOptionsDir>>)}
     * @memberof RollupOption
     */
    output?: Binding<NodeExpression<OutputOptionsFile | OutputOptionsDir>>;
    /**
     * rollup external setting.
     *
     * @type {Binding<NodeExpression<ExternalOption>>}
     * @memberof RollupOption
     */
    external?: Binding<NodeExpression<ExternalOption>>;
    /**
     * rollup plugins setting.
     *
     * @type {Binding<NodeExpression<Plugin[]>>}
     * @memberof RollupOption
     */
    plugins?: Binding<NodeExpression<Plugin[]>>;

    cache?: Binding<NodeExpression<RollupCache>>;
    watch?: Binding<NodeExpression<WatcherOptions>>;

    /**
     * custom setup rollup options.
     *
     * @type {(Binding<RollupFileOptions | RollupDirOptions>)}
     * @memberof RollupOption
     */
    options?: Binding<NodeExpression<RollupFileOptions | RollupDirOptions>>;
}

/**
 * rollup activity.
 *
 * @export
 * @class RollupActivity
 * @extends {NodeActivity<void>}
 */
@Task('rollup')
export class RollupActivity extends NodeActivity<void> {

    @Input()
    input: NodeExpression<Src>;

    @Input()
    output: NodeExpression<OutputOptionsFile | OutputOptionsDir>;

    @Input()
    plugins: NodeExpression<Plugin[]>;

    @Input()
    external: NodeExpression<ExternalOption>;

    @Input()
    sourcemap?: NodeExpression<boolean>;

    @Input()
    cache: NodeExpression<RollupCache>;

    @Input()
    options: NodeExpression<RollupFileOptions | RollupDirOptions>;

    @Input()
    watch: NodeExpression<WatcherOptions>;

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let opts = await this.resolveExpression(this.options, ctx);
        opts = opts || { input: '' };
        await Promise.all(['input', 'output', 'plugins', 'external', 'cache', 'watch']
            .map(async n => {
                let val = await this.resolveExpression(this[n], ctx);
                if (n === 'input') {
                    val = ctx.platform.toRootSrc(val);
                }
                if (isArray(val) && val.length) {
                    val = val.filter(f => !isNullOrUndefined(f));
                    if (val.length) {
                        opts[n] = val;
                    }
                } else if (val) {
                    opts[n] = val;
                }
            }));
        if (this.sourcemap) {
            let sourceMap = await this.resolveExpression(this.sourcemap, ctx);
            if (sourceMap) {
                opts.output.sourcemap = isString(sourceMap) ? true : sourceMap;
            }
        }
        if (opts.output.file) {
            opts.output.file = ctx.platform.toRootPath(opts.output.file);
        }
        if (opts.output.dir) {
            opts.output.dir = ctx.platform.toRootPath(opts.output.dir);
        }
        if (!opts.output.name && opts.output.file) {
            opts.output.name = ctx.platform.getFileName(opts.output.file);
        }
        opts.plugins = opts.plugins.filter(p => p);
        // if (ctx.platform.getRootPath() !== process.cwd()) {
        //     let matchs = [];
        //     if (isString(opts.input)) {
        //         matchs.push(opts.input.replace(ctx.platform.getFileName(opts.input), '**/*'));
        //     } else if (isArray(opts.input)) {
        //         opts.input.forEach((i: string) => {
        //             matchs.push(i.replace(ctx.platform.getFileName(i), '**/*'));
        //         });
        //     }
        //     let files = await ctx.platform.getFiles(matchs);
        //     let fmaps = {};
        //     let root = ctx.platform.getRootPath();
        //     files.forEach(f => {
        //         fmaps[f] =  readFileSync(f, {encoding: 'utf8'});
        //     });
        //     opts.plugins.concat(hypothetical({
        //         files: fmaps,
        //         cwd: root
        //     }))
        // }
        let bundle = await rollup(opts as any);
        await bundle.write(opts.output);
    }
}
