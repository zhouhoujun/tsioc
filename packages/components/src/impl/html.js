"use strict";
var _a;
var HtmlTemplateModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HtmlTemplateModule = exports.HtmlTemplateCompiler = exports.HTML_COMPILER_OPTIONS = exports.HtmlTemplateParser = exports.HtmlRenderer = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
// import { EventEmitter } from 'events';
const compiler_1 = require("./compiler");
const effect_1 = require("../effect");
const compiler_2 = require("../template/compiler");
const Renderer_1 = require("../renderer/Renderer");
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
let HtmlRenderer = class HtmlRenderer extends Renderer_1.Renderer {
};
exports.HtmlRenderer = HtmlRenderer;
exports.HtmlRenderer = HtmlRenderer = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], HtmlRenderer);
let HtmlTemplateParser = class HtmlTemplateParser {
    constructor(renderer) {
        this.renderer = renderer;
        this[_a] = true;
    }
};
exports.HtmlTemplateParser = HtmlTemplateParser;
_a = effect_1.noReact;
exports.HtmlTemplateParser = HtmlTemplateParser = tslib_1.__decorate([
    (0, ioc_1.Abstract)(),
    tslib_1.__metadata("design:paramtypes", [HtmlRenderer])
], HtmlTemplateParser);
const htmlDefaultOptions = {
    delimiters: ['{{', '}}'],
};
exports.HTML_COMPILER_OPTIONS = (0, ioc_1.token)('HTML_COMPILER_OPTIONS');
let HtmlTemplateCompiler = class HtmlTemplateCompiler extends compiler_1.AbstractTemplateCompiler {
    constructor(effect, renderer, parser, options) {
        super();
        this.effect = effect;
        this.renderer = renderer;
        this.parser = parser;
        this.options = options;
    }
};
exports.HtmlTemplateCompiler = HtmlTemplateCompiler;
exports.HtmlTemplateCompiler = HtmlTemplateCompiler = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__param(3, (0, ioc_1.Inject)(exports.HTML_COMPILER_OPTIONS, { defaultValue: htmlDefaultOptions })),
    tslib_1.__metadata("design:paramtypes", [effect_1.ReactiveEffect,
        HtmlRenderer,
        HtmlTemplateParser, Object])
], HtmlTemplateCompiler);
let HtmlTemplateModule = HtmlTemplateModule_1 = class HtmlTemplateModule {
    static withOptions(options) {
        return {
            module: HtmlTemplateModule_1,
            providers: [
                { provide: exports.HTML_COMPILER_OPTIONS, useValue: options }
            ]
        };
    }
};
exports.HtmlTemplateModule = HtmlTemplateModule;
exports.HtmlTemplateModule = HtmlTemplateModule = HtmlTemplateModule_1 = tslib_1.__decorate([
    (0, ioc_1.Module)({
        providers: [
            HtmlTemplateCompiler,
            { provide: compiler_2.TemplateCompiler, useClass: HtmlTemplateCompiler, asDefault: true }
        ]
    })
], HtmlTemplateModule);
//# sourceMappingURL=html.js.map