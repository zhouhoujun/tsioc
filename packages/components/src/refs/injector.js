"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentContext = exports.NodeInjector = exports.nodeResolveInterceptorFactory = exports.NODES_RESOLVERS = void 0;
const ioc_1 = require("@tsdi/ioc");
const element_1 = require("./element");
const directive_1 = require("./directive");
const container_1 = require("../impl/container");
const effect_1 = require("../effect");
const Renderer_1 = require("../renderer/Renderer");
exports.NODES_RESOLVERS = (0, ioc_1.token)('NODES_RESOLVERS');
const nodeResolveInterceptorFactory = () => {
    let hanlder;
    return (input, next, context) => {
        const nodeInjector = context.getInjector();
        const paramType = input.provider ?? input.type;
        const payload = nodeInjector.getPayload();
        if (payload instanceof element_1.ElementRef && nodeInjector instanceof NodeInjector && (0, ioc_1.isFunction)(paramType)) {
            if (!hanlder) {
                hanlder = (0, ioc_1.createResolveHandler)(nodeInjector.get(exports.NODES_RESOLVERS) ?? []);
            }
            return (0, ioc_1.invokeTail)(() => hanlder.handle(input, context), (res) => {
                if ((0, ioc_1.isResolved)(res))
                    return res;
                return next(input, context);
            });
        }
        return next(input, context);
    };
};
exports.nodeResolveInterceptorFactory = nodeResolveInterceptorFactory;
/**
 * Node Injector - Context injector for template nodes
 */
class NodeInjector extends ioc_1.ContextInjector {
    constructor() {
        super(...arguments);
        this[_a] = true;
        this.componentRefs = new Map();
        this.directiveRefs = new Map();
        this.templateRefs = new Map();
        this.elementRefs = new Map();
        this.viewContainerRefs = new Map();
        this.computedCache = new Map();
        this.parentNodes = new Map();
    }
    get allDirectiveRefs() {
        if (!this._allDirectiveRefs) {
            const root = this.getRootInjector();
            if (root && root !== this) {
                return root.allDirectiveRefs;
            }
            if (!this._allDirectiveRefs) {
                this._allDirectiveRefs = new Map();
            }
        }
        return this._allDirectiveRefs;
    }
    getRootInjector() {
        let root = this;
        while (root?.getParentInjector()) {
            root = root.getParentInjector();
        }
        return root;
    }
    initOptions(options) {
        if (!options.resolvers)
            options.resolvers = [];
        options.resolvers.push((0, exports.nodeResolveInterceptorFactory)());
        if (options.payload) {
            this._payload = options.payload;
        }
    }
    setPayload(payload) {
        this._payload = payload;
        return this;
    }
    getPayload() {
        return this._payload;
    }
    clear() {
        this.componentRefs.clear();
        this.directiveRefs.clear();
        this.templateRefs.clear();
        this.computedCache.clear();
        this.viewContainerRefs.clear();
        this.parentNodes.clear();
    }
    getParentInjector() {
        return this._parent instanceof NodeInjector ? this._parent : null;
    }
    attachComponent(compRef) {
        if (compRef && compRef.elementRef && compRef.elementRef.nativeElement) {
            const el = compRef.elementRef.nativeElement;
            if (!this.elementRefs.has(el)) {
                this.elementRefs.set(el, compRef.elementRef);
            }
            this.componentRefs.set(compRef.elementRef.nativeElement, compRef);
        }
    }
    attachDirective(dirRef) {
        if (dirRef && dirRef.elementRef && dirRef.elementRef.nativeElement) {
            const element = dirRef.elementRef.nativeElement;
            if (!this.elementRefs.has(element)) {
                this.elementRefs.set(element, dirRef.elementRef);
            }
            if (!this.directiveRefs.has(element)) {
                this.directiveRefs.set(element, []);
            }
            this.directiveRefs.get(element).push(dirRef);
            if (!this.allDirectiveRefs.has(element)) {
                this.allDirectiveRefs.set(element, []);
            }
            this.allDirectiveRefs.get(element).push(dirRef);
        }
    }
    attachTemplate(tempRef) {
        if (tempRef && tempRef.elementRef && tempRef.elementRef.nativeElement) {
            const el = tempRef.elementRef.nativeElement;
            if (!this.elementRefs.has(el)) {
                this.elementRefs.set(el, tempRef.elementRef);
            }
            this.templateRefs.set(el, tempRef);
        }
    }
    query(selector, el) {
        let sel;
        let def;
        if ((0, ioc_1.isString)(selector)) {
            sel = selector;
        }
        else {
            def = (0, ioc_1.getDef)(selector);
            sel = def.selector;
        }
        if (!sel) {
            return null;
        }
        const node = this.get(Renderer_1.Renderer).querySelector(el, sel);
        if (node) {
            if (def && def.dirType) {
                if (def.dirType === directive_1.DirectiveType.Component) {
                    return this.getComponentRefByNode(node) ?? null;
                }
                return this.getDirectiveRefByNode(node) ?? null;
            }
            // For CSS string selectors, prefer ElementRef over TemplateRef
            // This matches expected behavior for element queries like '.switch-content'
            return this.getElementRef(node) ?? this.getTemplateRef(node);
        }
        return null;
    }
    queryAll(selector, el) {
        let sel;
        let def;
        if ((0, ioc_1.isString)(selector)) {
            sel = selector;
        }
        else {
            def = (0, ioc_1.getDef)(selector);
            sel = def.selector;
        }
        if (!sel) {
            return [];
        }
        const nodes = this.get(Renderer_1.Renderer).querySelectorAll(el, sel);
        if (!nodes) {
            return [];
        }
        return nodes.map(node => {
            if (def && def.dirType) {
                if (def.dirType === directive_1.DirectiveType.Component) {
                    return this.getComponentRefByNode(node) ?? null;
                }
                return this.getDirectiveRefByNode(node) ?? null;
            }
            // For CSS string selectors, prefer ElementRef over TemplateRef
            return this.getElementRef(node) ?? this.getTemplateRef(node);
        });
    }
    getComponentRef(componentType, flags = ioc_1.InjectFlags.Default) {
        const results = this.getParentInjector()?.getComponentRef(componentType) ?? [];
        this.componentRefs.forEach(ref => {
            if (ref.instance instanceof componentType) {
                results.push(ref);
            }
        });
        return results;
    }
    getComponentRefByNode(node, flags = ioc_1.InjectFlags.Default) {
        return this.componentRefs.get(node) ?? this.getParentInjector()?.getComponentRefByNode(node) ?? null;
    }
    getDirectiveRef(directorType, flags = ioc_1.InjectFlags.Default) {
        const results = [];
        if (flags & ioc_1.InjectFlags.SkipSelf) {
            const parentResults = this.getParentInjector()?.getDirectiveRef(directorType, flags) ?? [];
            results.push(...parentResults);
        }
        else {
            this.directiveRefs.forEach(refs => {
                refs.forEach(ref => {
                    try {
                        if (ref.instance && ref.instance instanceof directorType) {
                            results.push(ref);
                        }
                    }
                    catch (e) {
                        // skip
                    }
                });
            });
            if (results.length === 0) {
                const allRefs = this.allDirectiveRefs;
                allRefs.forEach(refs => {
                    refs.forEach(ref => {
                        try {
                            if (ref.instance && ref.instance instanceof directorType) {
                                results.push(ref);
                            }
                        }
                        catch (e) {
                            // skip
                        }
                    });
                });
            }
            if (!(flags & ioc_1.InjectFlags.Self)) {
                const parentResults = this.getParentInjector()?.getDirectiveRef(directorType, flags) ?? [];
                results.push(...parentResults);
            }
        }
        return results;
    }
    getDirectiveRefByNode(node, flags = ioc_1.InjectFlags.Default) {
        if (flags & ioc_1.InjectFlags.SkipSelf) {
            return this.getParentInjector()?.getDirectiveRefByNode(node, flags) ?? null;
        }
        const refs = this.directiveRefs.get(node);
        if (refs && refs.length > 0)
            return refs[0];
        const staticRefs = this.allDirectiveRefs.get(node);
        if (staticRefs && staticRefs.length > 0)
            return staticRefs[0];
        if (!(flags & ioc_1.InjectFlags.Self)) {
            return this.getParentInjector()?.getDirectiveRefByNode(node, flags) ?? null;
        }
        return null;
    }
    getDirectiveRefsByNode(node, flags = ioc_1.InjectFlags.Default) {
        if (flags & ioc_1.InjectFlags.SkipSelf) {
            return this.getParentInjector()?.getDirectiveRefsByNode(node, flags) ?? null;
        }
        const refs = this.directiveRefs.get(node);
        if (refs && refs.length > 0)
            return refs;
        const staticRefs = this.allDirectiveRefs.get(node);
        if (staticRefs && staticRefs.length > 0)
            return staticRefs;
        if (!(flags & ioc_1.InjectFlags.Self)) {
            return this.getParentInjector()?.getDirectiveRefsByNode(node, flags) ?? null;
        }
        return null;
    }
    getTemplateRef(node, flags = ioc_1.InjectFlags.Default) {
        if (flags & ioc_1.InjectFlags.SkipSelf) {
            return this.getParentInjector()?.getTemplateRef(node, flags) ?? null;
        }
        const ref = this.templateRefs.get(node);
        if (ref)
            return ref;
        if (!(flags & ioc_1.InjectFlags.Self)) {
            return this.getParentInjector()?.getTemplateRef(node, flags) ?? null;
        }
        return null;
    }
    getElementRef(node, flags = ioc_1.InjectFlags.Default) {
        if (flags & ioc_1.InjectFlags.SkipSelf) {
            const parentRef = this.getParentInjector()?.getElementRef(node, flags);
            if (parentRef)
                return parentRef;
        }
        const ref = this.elementRefs.get(node);
        if (ref)
            return ref;
        if (!(flags & ioc_1.InjectFlags.Self) && !(flags & ioc_1.InjectFlags.SkipSelf)) {
            const parentRef = this.getParentInjector()?.getElementRef(node, flags);
            if (parentRef)
                return parentRef;
        }
        const eRef = new element_1.ElementRef(node);
        this.elementRefs.set(node, eRef);
        return eRef;
    }
    getViewContainerRef(nodeOrRef, flags = ioc_1.InjectFlags.Default) {
        const node = nodeOrRef instanceof element_1.ElementRef ? nodeOrRef.nativeElement : nodeOrRef;
        if (flags & ioc_1.InjectFlags.SkipSelf) {
            const parentRef = this.getParentInjector()?.getViewContainerRef(node, flags);
            if (parentRef)
                return parentRef;
        }
        const ref = this.viewContainerRefs.get(node);
        if (ref)
            return ref;
        if (!(flags & ioc_1.InjectFlags.Self) && !(flags & ioc_1.InjectFlags.SkipSelf)) {
            const parentRef = this.getParentInjector()?.getViewContainerRef(node, flags);
            if (parentRef)
                return parentRef;
        }
        let elementRef = this.elementRefs.get(node);
        if (!elementRef) {
            elementRef = new element_1.ElementRef(node);
            this.elementRefs.set(node, elementRef);
        }
        const containerRef = (0, container_1.createViewContainerRef)(elementRef, this);
        this.viewContainerRefs.set(node, containerRef);
        return containerRef;
    }
    createElementRef(node) {
        const eRef = new element_1.ElementRef(node);
        this.elementRefs.set(node, eRef);
        return eRef;
    }
    createViewContainerRef(node) {
        let elementRef = this.elementRefs.get(node);
        if (!elementRef) {
            elementRef = new element_1.ElementRef(node);
            this.elementRefs.set(node, elementRef);
        }
        const containerRef = (0, container_1.createViewContainerRef)(elementRef, this);
        this.viewContainerRefs.set(node, containerRef);
        return containerRef;
    }
    setParentNode(node, parent) {
        this.parentNodes.set(node, parent);
    }
    getParentNode(node) {
        return this.parentNodes.get(node) ?? this.getParentInjector()?.getParentNode(node) ?? null;
    }
}
exports.NodeInjector = NodeInjector;
exports.EnvironmentContext = NodeInjector;
_a = effect_1.noReact;
//# sourceMappingURL=injector.js.map