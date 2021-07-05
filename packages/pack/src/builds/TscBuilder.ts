import { Attribute, Input } from '@tsdi/components';
import { Task, TemplateOption, Src } from '@tsdi/activities';
import { CompilerOptions } from 'typescript';
import { NodeExpression, NodeActivityContext } from '../NodeActivityContext';
import { NodeActivity } from '../NodeActivity';

/**
 * tsc build option.
 */
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

const jsChkExp = /.js/;

@Task('tsc')
export class TscBuilder extends NodeActivity<void> {

    @Input() src: NodeExpression<Src>;
    @Input() dist: NodeExpression<string>;
    @Input() tsconfig: NodeExpression<string>;
    @Input() compilerOptions: NodeExpression<CompilerOptions>;

    async execute(ctx: NodeActivityContext): Promise<void> {
        let compilerOptions = await ctx.resolveExpression(this.compilerOptions);
        compilerOptions = compilerOptions || {};
        let src = await ctx.resolveExpression(this.src);
        src = src || compilerOptions.sourceRoot;
        let srcFiles: string[];
        if (src) {
            srcFiles = await ctx.platform.getFiles(src);
        }
        let dist = await ctx.resolveExpression(this.dist);
        if (dist) {
            if (!jsChkExp.test(dist)) {
                compilerOptions.outDir = dist;
            } else {
                compilerOptions.outFile = dist;
            }
        }

        let tsconfig = await ctx.resolveExpression(this.tsconfig);

        let shell = '';

        if (tsconfig) {
            shell = `tsc -p ${tsconfig}`;
        } else {
            shell = `tsc ${this.formatCompileOptions(compilerOptions)} ${srcFiles.join(' ')}`;
        }

        return await ctx.getExector().runActivity({
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
