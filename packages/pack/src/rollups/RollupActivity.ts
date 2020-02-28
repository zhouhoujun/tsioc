import { isArray, isNullOrUndefined, isString } from '@tsdi/ioc';
import { Input, Binding } from '@tsdi/components';
import { TemplateOption, Task, Src } from '@tsdi/activities';
import {
    rollup, WatcherOptions, RollupCache, ExternalOption, GlobalsOption, RollupOptions, OutputOptions
} from 'rollup';
import { NodeActivityContext, NodeExpression } from '../NodeActivityContext';
import { NodeActivity } from '../NodeActivity';

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
     * @type {(Binding<NodeExpression<OutputOptions>>)}
     * @memberof RollupOption
     */
    output?: Binding<NodeExpression<OutputOptions>>;
    /**
     * rollup external setting.
     *
     * @type {Binding<NodeExpression<ExternalOption>>}
     * @memberof RollupOption
     */
    external?: Binding<NodeExpression<ExternalOption>>;
    /**
     * globals.
     *
     * @type {Binding<NodeExpression<GlobalsOption>>}
     * @memberof RollupOption
     */
    globals?: Binding<NodeExpression<GlobalsOption>>;
    /**
     * rollup plugins setting.
     *
     * @type {Binding<NodeExpression<Plugin[]>>}
     * @memberof RollupOption
     */
    plugins?: Binding<NodeExpression<Plugin[]>>;
    /**
     * cache.
     */
    cache?: Binding<NodeExpression<RollupCache>>;
    watch?: Binding<NodeExpression<WatcherOptions>>;

    /**
     * custom setup rollup options.
     *
     * @type {(Binding<RollupOptions>)}
     * @memberof RollupOption
     */
    options?: Binding<NodeExpression<RollupOptions>>;
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

    @Input() input: NodeExpression<Src>;

    @Input() output: NodeExpression<OutputOptions>;

    @Input() plugins: NodeExpression<Plugin[]>;

    @Input() external: NodeExpression<ExternalOption>;

    @Input() globals?: NodeExpression<GlobalsOption>;

    @Input() sourcemap?: NodeExpression<boolean>;

    @Input() cache: NodeExpression<RollupCache>;

    @Input() options: NodeExpression<RollupOptions>;

    @Input() watch: NodeExpression<WatcherOptions>;

    async execute(ctx: NodeActivityContext): Promise<void> {
        let opts = await ctx.resolveExpression(this.options);
        opts = opts || { input: '' };
        await Promise.all(this.getInputProps()
            .map(async n => {
                let val = await ctx.resolveExpression(this[n]);
                this.setOptions(ctx, opts, n, val);
            }));
        await Promise.all((isArray(opts.output) ? opts.output : [opts.output]).map(async output => {
            if (this.sourcemap) {
                let sourceMap = await ctx.resolveExpression(this.sourcemap);
                if (sourceMap) {
                    output.sourcemap = isString(sourceMap) ? true : sourceMap;
                }
            }
            if (this.globals) {
                let globals = await ctx.resolveExpression(this.globals);
                output.globals = globals;
            } else {
                output.globals = {};
            }

            if (isArray(opts.external) && opts.external.length) {
                opts.external = this.vailfExternal(opts.external);
                opts.external.forEach(k => {
                    if (!output.globals[k]) {
                        output.globals[k] = k;
                    }
                });
            }
            if (output.file) {
                output.file = ctx.platform.toRootPath(output.file);
            }
            if (output.dir) {
                output.dir = ctx.platform.toRootPath(output.dir);
            }
            if (!output.name && output.file) {
                output.name = ctx.platform.getFileName(output.file);
            }
            await this.resolvePlugins(ctx, opts);
            if (opts.plugins) {
                opts.plugins = opts.plugins.filter(p => p);
            }

            let bundle = await rollup(opts);
            await bundle.write(output);
        }));
    }

    protected getInputProps(): string[] {
        return ['input', 'output', 'plugins', 'external', 'cache', 'watch'];
    }

    protected setOptions(ctx: NodeActivityContext, opts: RollupOptions, key: string, val: any) {
        if (key === 'input') {
            val = ctx.platform.toRootSrc(val);
        }
        if (isArray(val) && val.length) {
            val = val.filter(f => !isNullOrUndefined(f));
            if (val.length) {
                opts[key] = val;
            }
        } else if (val) {
            opts[key] = val;
        }
    }

    protected vailfExternal(external: string[]): string[] {
        return external || [];
    }

    protected async resolvePlugins(ctx: NodeActivityContext, opts: RollupOptions) {

    }
}
