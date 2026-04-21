import { CompilerOptions, TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { TemplateFactory } from '../refs/template';
export declare abstract class AbstractTemplateCompiler<T = any> extends TemplateCompiler<T> {
    protected abstract get options(): TemplateCompilerOptions;
    private _delimiter?;
    protected get delimiter(): RegExp;
    /**
     * 编译模板并返回 TemplateFactory
     */
    compile<C>(template: T, options: CompilerOptions): TemplateFactory<C>;
}
