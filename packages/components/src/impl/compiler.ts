import { Abstract } from '@tsdi/ioc';
import { CompilerOptions, TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { createTemplateRef } from './template';
import { TemplateFactory } from '../refs/template';
import {
    applyDirectiveToElement, compileAttributeToFactory, compileComponentToFactory,
    compileElementToFactory, compileTemplateToFactory, compileTextToFactory,
    compileToFactory, generateNodeBindings
} from './compiler-fns';



@Abstract()
export abstract class AbstractTemplateCompiler<T = any> extends TemplateCompiler<T> {

    protected abstract get options(): TemplateCompilerOptions;

    private _delimiter?: RegExp;
    protected get delimiter() {
        if (!this._delimiter) {
            const [open, close] = this.options.delimiters || ['{{', '}}'];
            this._delimiter = new RegExp(`${open}(.*?)${close}`, 'g');
        }
        return this._delimiter;
    }



    /**
     * 编译模板并返回 TemplateFactory
     */
    compile<C>(template: T, options: CompilerOptions): TemplateFactory<C> {
        const nodes = this.parser.parse(template);

        generateNodeBindings<C>(nodes, options.directives, options.components, this.renderer, this.delimiter);

        // 将模板编译为 node factory
        const factory = compileToFactory<C>(nodes, this.renderer, options, {
            delimiter: this.delimiter,
            textToFactory: compileTextToFactory,
            elementToFactory: compileElementToFactory,
            attributeToFactory: compileAttributeToFactory,
            componentToFactory: compileComponentToFactory,
            templateToFactory: compileTemplateToFactory,
            directiveToElement: applyDirectiveToElement,
        });

        return (host, environment) => createTemplateRef<C>(factory, host, { environment });
    }


}

