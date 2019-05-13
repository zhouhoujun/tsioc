import { NodeActivityContext, NodeActivity } from '../core';
import { Input } from '@tsdi/boot';
import { Expression, TemplateOption, Task, Src } from '@tsdi/activities';
import { RollupFileOptions, rollup, WatcherOptions, RollupDirOptions, RollupCache, OutputOptionsFile, OutputOptionsDir, ExternalOption } from 'rollup';
import { isArray, isNullOrUndefined } from '@tsdi/ioc';

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
     * @type {Expression<Src>}
     * @memberof RollupOption
     */
    input: Expression<Src>;
    /**
     * rollup output setting.
     *
     * @type {(Expression<OutputOptionsFile | OutputOptionsDir>)}
     * @memberof RollupOption
     */
    output?: Expression<OutputOptionsFile | OutputOptionsDir>;
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

@Task('rollup')
export class RollupActivity extends NodeActivity<void> {

    @Input()
    input: Expression<Src>;

    @Input()
    output: Expression<OutputOptionsFile | OutputOptionsDir>;

    @Input()
    plugins: Expression<Plugin[]>;

    @Input()
    external: Expression<ExternalOption>;

    @Input()
    cache: Expression<RollupCache>;

    @Input()
    options: Expression<RollupFileOptions | RollupDirOptions>;

    @Input()
    watch: Expression<WatcherOptions>;

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let opts = await this.resolveExpression(this.options, ctx);
        opts = opts || { input: '' };
        await Promise.all(['input', 'output', 'plugins', 'external', 'cache', 'watch']
            .map(async n => {
                let val = await this.resolveExpression(this[n], ctx);
                if (isArray(val) && val.length) {
                    val = val.filter(f => !isNullOrUndefined(f));
                    if (val.length) {
                        opts[n] = val;
                    }
                } else if (val) {
                    opts[n] = val;
                }
            }));

        let bundle = await rollup(opts as any);
        await bundle.write(opts.output);
    }
}
