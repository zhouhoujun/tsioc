import { Abstract } from '@tsdi/ioc';
import { CompilerOptions, TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { createTemplateRef } from './template';
import { TemplateFactory } from '../refs/template';
import { RElement, RNode, NodeType } from '../renderer/Node';
import { validateSchemaElement } from '../template/schema';
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

        if (options.schemas?.length) {
            const declaredElements = new Set(
                [...options.components, ...(options.customElements || [])]
                    .flatMap(def => String(def.selector || '').split(','))
                    .map(selector => selector.trim().toLowerCase())
                    .filter(selector => /^[a-z][\w-]*$/.test(selector))
            );
            const validate = (node: RNode): void => {
                if (node.nodeType === NodeType.Element) {
                    const name = String((node as RElement).tagName || '').toLowerCase();
                    if (name && !declaredElements.has(name)) validateSchemaElement(name, options.schemas!);
                }
                node.childNodes?.forEach(validate);
            };
            nodes.forEach(validate);
        }

        generateNodeBindings<C>(nodes, options.directives, options.components, this.renderer, this.delimiter, undefined, options.customElements);

        // 将模板编译为 node factory
        const factory = compileToFactory<C>(nodes, this.renderer, options, {
            delimiter: this.delimiter,
            templateTag: this.options.templateTag || 'v-template',
            textFactory: compileTextToFactory,
            elementFactory: compileElementToFactory,
            attributeFactory: compileAttributeToFactory,
            componentFactory: compileComponentToFactory,
            templateFactory: compileTemplateToFactory,
            bindDirective: applyDirectiveToElement,
        });

        return (host, injector) => createTemplateRef<C>(factory, host, { injector });
    }


}
