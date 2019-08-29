import { Task, TemplateOption, Src, Activities } from '@tsdi/activities';
import { Binding, Input } from '@tsdi/components';
import { NodeExpression, NodeActivity, NodeActivityContext } from '../core';
import { CompilerOptions } from 'typescript';
import { isString } from '@tsdi/ioc';


export interface TscBuilderOption extends TemplateOption {
    /**
     * tsconfig.
     *
     * @type {Binding<NodeExpression<string>>}
     * @memberof TscCompileActivityConfig
     */
    tsconfig?: Binding<NodeExpression<string>>;

    /**
     * ts file source.
     *
     * @type {CBinding<NodeExpression<Src>>}
     * @memberof TscCompileActivityConfig
     */
    src?: Binding<NodeExpression<Src>>;

    /**
     * ts compile out dir.
     *
     * @type {Binding<NodeExpression<string>>}
     * @memberof TscCompileActivityConfig
     */
    dist?: Binding<NodeExpression<string>>;
    /**
     * compiler options.
     *
     * @type {Binding<NodeExpression<CompilerOptions>>}
     * @memberof TscCompileActivityConfig
     */
    compilerOptions?: Binding<NodeExpression<CompilerOptions>>;
}

@Task('tsc')
export class TscBuilder extends NodeActivity<void> {

    @Input() src: NodeExpression<Src>;
    @Input() dist: NodeExpression<string>;
    @Input() tsconfig: NodeExpression<string>;
    @Input() compilerOptions: NodeExpression<CompilerOptions>;

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let compilerOptions = await this.resolveExpression(this.compilerOptions, ctx);
        compilerOptions = compilerOptions || {};
        let src = await this.resolveExpression(this.src, ctx);
        src = src || compilerOptions.sourceRoot;
        let srcFiles: string[];
        if (src) {
            srcFiles = await ctx.platform.getFiles(src);
        }
        let dist = await this.resolveExpression(this.dist, ctx);
        if (dist) {
            if (!/.ts/.test(dist)) {
                compilerOptions.outDir = dist;
            } else {
                compilerOptions.outFile = dist;
            }
        }

        let tsconfig = await this.resolveExpression(this.tsconfig, ctx);

        let shell = '';

        if (tsconfig) {
            shell = `tsc -p ${tsconfig}`;
        } else {
            shell = `tsc ${this.formatCompileOptions(compilerOptions)} ${srcFiles.join(' ')}`;
        }

        await this.execActivity(ctx, {
            activity: 'shell',
            parallel: true,
            shell: shell,
            options: { cwd: ctx.platform.getRootPath() }
        })
    }

    formatCompileOptions(options: CompilerOptions): string {
        return ''
    }

}
