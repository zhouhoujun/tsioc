// import { parseFragment, TreeAdapter, defaultTreeAdapter } from 'parse5';
import { TemplateParser } from '../template/parser';
import { RComment, RElement, RNode, RText, NodeType, RCssStyleDeclaration, RDomTokenList } from '../renderer/Node';
import { Abstract, Inject, Injectable, Injector, isArray, lang, Module, ModuleWithProviders, ProvdierOf, token } from '@tsdi/ioc';
// import { EventEmitter } from 'events';
import { AbstractTemplateCompiler } from './compiler';
import { ReactiveEffect, noReact } from '../effect';
import { TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { Renderer, RendererStyleFlags2 } from '../renderer/Renderer';


// @Injectable()
// export class HtmlRenderer implements Renderer {

//     // 创建XML注释节点
//     createComment(value: string): Comment {
//         return new Comment(value);
//     }

//     // 创建XML元素节点（支持命名空间）
//     createElement(name: string, namespace?: string | null): HTMLElement {
//         const element = new HTMLElement();
//         if (namespace) {
//             element.setAttributeNS(namespace, name, namespace);
//         }
//         return element;
//     }

//     // 创建XML文本节点
//     createText(value: string): RText {
//         return new Text(value)
//     }

//     // 实现节点.appendChild
//     appendChild(parent: RElement, newChild: RNode): void {
//         newChild.parentNode = parent;
//         if (parent.firstChild === null) {
//             parent.firstChild = newChild;
//         } else {
//             const lastChild = parent.childNodes[parent.childNodes.length - 1];
//             lastChild.nextSibling = newChild;
//         }
//         parent.childNodes.push(newChild);
//     }

//     // 实现节点.insertBefore
//     insertBefore(parent: RElement, newChild: RNode, refChild: RNode | null): void {
//         parent.insertBefore(newChild, refChild);
//     }

//     removeChild(parent: RElement | null, oldChild: RNode, isHostElement?: boolean): void {
//         parent?.removeChild(oldChild)
//     }
//     selectRootElement(selectorOrNode: string | any, preserveContent?: boolean): RElement {
//         throw new Error('Method not implemented.');
//     }
//     parentNode(node: RNode): RElement | null {
//         return node.parentElement
//     }
//     nextSibling(node: RNode): RNode | null {
//         return node.nextSibling;
//     }
//     setAttribute(el: RElement, name: string, value: string, namespace?: string | null): void {
//         if (namespace) {
//             el.setAttributeNS(namespace, name, value)
//         } else {
//             el.setAttribute(name, value)
//         }
//     }
//     removeAttribute(el: RElement, name: string, namespace?: string | null): void {
//         if (namespace) {
//             el.setAttributeNS(namespace, name, '')
//         } else {
//             el.removeAttribute(name)
//         }
//     }
//     addClass(el: XmlElement, name: string): void {
//         el.classList.add(name);
//     }
//     removeClass(el: XmlElement, name: string): void {
//         el.classList.remove(name);
//     }
//     setStyle(el: XmlElement, style: string, value: any, flags?: RendererStyleFlags2): void {
//         el.style.setProperty(style, value);
//     }
//     removeStyle(el: XmlElement, style: string, flags?: RendererStyleFlags2): void {
//         el.style.removeProperty(style);
//     }
//     setProperty(el: XmlElement, name: string, value: any): void {
//         el.setProperty?.(name, value);
//     }
//     setValue(node: XmlText | XmlComment, value: string): void {
//         node.textContent = value;
//     }

// }

@Abstract()
export abstract class HtmlRenderer extends Renderer {

}

@Abstract()
export abstract class HtmlTemplateParser implements TemplateParser {

    [noReact] = true;

    constructor(
        protected renderer: HtmlRenderer
    ) { }


    abstract parse(template: string): RNode[];

}


const htmlDefaultOptions = {
    delimiters: ['{{', '}}'],
} as TemplateCompilerOptions;





export interface HtmlTemplateCompilerOptions extends TemplateCompilerOptions {
    renderer?: ProvdierOf<HtmlRenderer>;
}

export const HTML_COMPILER_OPTIONS = token<HtmlTemplateCompilerOptions>('HTML_COMPILER_OPTIONS');


@Injectable()
export class HtmlTemplateCompiler extends AbstractTemplateCompiler {

    constructor(
        readonly effect: ReactiveEffect,
        readonly renderer: HtmlRenderer,
        readonly parser: HtmlTemplateParser,
        @Inject(HTML_COMPILER_OPTIONS, { defaultValue: htmlDefaultOptions }) protected options: HtmlTemplateCompilerOptions) {
        super()
    }
}




@Module({
    providers: [
        HtmlTemplateCompiler,
        { provide: TemplateCompiler, useClass: HtmlTemplateCompiler, asDefault: true }
    ]
})
export class HtmlTemplateModule {
    static withOptions(options: HtmlTemplateCompilerOptions): ModuleWithProviders<HtmlTemplateModule> {
        return {
            module: HtmlTemplateModule,
            providers: [
                { provide: HTML_COMPILER_OPTIONS, useValue: options }
            ]
        }
    }
}
