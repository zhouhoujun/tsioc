"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.componentResolvers = exports.directorResovler = exports.viewContainerRefResovler = exports.componentRefResovler = exports.directorRefResovler = exports.templateRefResovler = exports.elementRefResovler = void 0;
exports.resolveDirectiveFromNode = resolveDirectiveFromNode;
exports.resolveComponentFromNode = resolveComponentFromNode;
const ioc_1 = require("@tsdi/ioc");
const injector_1 = require("../refs/injector");
const element_1 = require("../refs/element");
const template_1 = require("../refs/template");
const directive_1 = require("../refs/directive");
const component_1 = require("../refs/component");
const container_1 = require("../refs/container");
const Renderer_1 = require("../renderer/Renderer");
const Node_1 = require("../renderer/Node");
const elementRefResovler = (input, next, context) => {
    const paramType = (input.provider ?? input.type);
    if (paramType === element_1.ElementRef || (0, ioc_1.isBaseOf)(paramType, element_1.ElementRef)) {
        return context.getInjector().getPayload();
    }
    return next(input, context);
};
exports.elementRefResovler = elementRefResovler;
const templateRefResovler = (input, next, context) => {
    const paramType = (input.provider ?? input.type);
    if (paramType === template_1.TemplateRef || (0, ioc_1.isBaseOf)(paramType, template_1.TemplateRef)) {
        const injector = context.getInjector();
        const elementRef = injector.getPayload();
        let templateRef = injector.getTemplateRef(elementRef.nativeElement, input.flags);
        if (!templateRef) {
            templateRef = createAndAttachDirectiveForNode(injector, elementRef.nativeElement);
        }
        return templateRef ?? ioc_1.UNRESOLVED;
    }
    return next(input, context);
};
exports.templateRefResovler = templateRefResovler;
const directorRefResovler = (input, next, context) => {
    const paramType = (input.provider ?? input.type);
    if (paramType === directive_1.DirectiveRef || (0, ioc_1.isBaseOf)(paramType, directive_1.DirectiveRef)) {
        const injector = context.getInjector();
        const elementRef = injector.getPayload();
        return injector.getDirectiveRefByNode(elementRef.nativeElement, input.flags) ?? ioc_1.UNRESOLVED;
    }
    return next(input, context);
};
exports.directorRefResovler = directorRefResovler;
const componentRefResovler = (input, next, context) => {
    const paramType = (input.provider ?? input.type);
    if (paramType === component_1.ComponentRef || (0, ioc_1.isBaseOf)(paramType, component_1.ComponentRef)) {
        const injector = context.getInjector();
        const elementRef = injector.getPayload();
        return injector.getComponentRefByNode(elementRef.nativeElement, input.flags) ?? ioc_1.UNRESOLVED;
    }
    return next(input, context);
};
exports.componentRefResovler = componentRefResovler;
function createAndAttachDirectiveForNode(injector, node) {
    const directives = node[Node_1.DIRECTIVES];
    if (!directives || directives.length === 0) {
        return injector.getTemplateRef(node);
    }
    for (const dirDef of directives) {
        if (dirDef.dirType === directive_1.DirectiveType.Iterable || dirDef.dirType === directive_1.DirectiveType.Conditional) {
            let dirRef = injector.getDirectiveRefByNode(node);
            if (!dirRef) {
                const elementRef = injector.getElementRef(node);
                dirRef = dirDef.ƿfac?.(injector, { elementRef });
                if (dirRef) {
                    injector.attachDirective(dirRef);
                }
            }
            if (dirRef) {
                return injector.getTemplateRef(node);
            }
        }
    }
    return injector.getTemplateRef(node);
}
function createAndAttachComponentForNode(injector, node) {
    const compDef = node[Node_1.COMPONENTDEF];
    if (!compDef) {
        return null;
    }
    let compRef = injector.getComponentRefByNode(node);
    if (!compRef) {
        const elementRef = injector.getElementRef(node);
        compRef = compDef.ƿfac?.(injector, { elementRef });
        if (compRef) {
            injector.attachComponent(compRef);
        }
    }
    return compRef;
}
const viewContainerRefResovler = (input, next, context) => {
    const paramType = (input.provider ?? input.type);
    if (paramType === container_1.ViewContainerRef || (0, ioc_1.isBaseOf)(paramType, container_1.ViewContainerRef)) {
        const injector = context.getInjector();
        const elementRef = injector.getPayload();
        const containerRef = injector.getViewContainerRef(elementRef.nativeElement, input.flags);
        if (containerRef) {
            return containerRef;
        }
        return injector.createViewContainerRef(elementRef.nativeElement) ?? ioc_1.UNRESOLVED;
    }
    return next(input, context);
};
exports.viewContainerRefResovler = viewContainerRefResovler;
const directorResovler = (input, next, context) => {
    const paramType = (input.provider ?? input.type);
    const dirDef = (0, ioc_1.getDef)(paramType);
    const dirType = dirDef?.dirType;
    if (dirDef) {
        if (input.provider) {
            return next(input, context);
        }
        const injector = context.getInjector();
        const flags = input.flags ?? ioc_1.InjectFlags.Default;
        if (dirType === directive_1.DirectiveType.Conditional || dirType === directive_1.DirectiveType.Iterable) {
            const dirRefs = injector.getDirectiveRef(paramType, flags);
            if (dirRefs && dirRefs.length > 0) {
                return dirRefs[0].instance;
            }
            return ioc_1.UNRESOLVED;
        }
        const dirRefs = injector.getDirectiveRef(paramType, flags);
        if (dirRefs && dirRefs.length > 0) {
            return dirRefs[0].instance;
        }
        const renderer = injector.get(Renderer_1.Renderer);
        const elementRef = injector.getPayload();
        if (dirType === directive_1.DirectiveType.Component) {
            const compRefs = injector.getComponentRef(paramType, flags);
            if (compRefs && compRefs.length > 0) {
                return compRefs[0];
            }
            let compRef = createAndAttachComponentForNode(injector, elementRef.nativeElement);
            if (!compRef && dirDef.selector) {
                const nodes = renderer.querySelectorAll(elementRef.nativeElement, dirDef.selector);
                if (nodes && nodes.length > 0) {
                    compRef = createAndAttachComponentForNode(injector, nodes[0]);
                }
            }
            return compRef ?? ioc_1.UNRESOLVED;
        }
        return ioc_1.UNRESOLVED;
    }
    return next(input, context);
};
exports.directorResovler = directorResovler;
function resolveDirectiveFromNode(injector, node, directiveType) {
    const directives = node[Node_1.DIRECTIVES];
    if (!directives) {
        return null;
    }
    for (const dirDef of directives) {
        if (dirDef.type === directiveType) {
            let dirRef = injector.getDirectiveRefByNode(node);
            if (!dirRef) {
                const elementRef = injector.getElementRef(node);
                dirRef = dirDef.ƿfac?.(injector, { elementRef });
                if (dirRef) {
                    injector.attachDirective(dirRef);
                }
            }
            return dirRef;
        }
    }
    return null;
}
function resolveComponentFromNode(injector, node, componentType) {
    const compDef = node[Node_1.COMPONENTDEF];
    if (!compDef || compDef.type !== componentType) {
        return null;
    }
    let compRef = injector.getComponentRefByNode(node);
    if (!compRef) {
        const elementRef = injector.getElementRef(node);
        compRef = compDef.ƿfac?.(injector, { elementRef });
        if (compRef) {
            injector.attachComponent(compRef);
        }
    }
    return compRef;
}
exports.componentResolvers = [
    { provide: injector_1.NODES_RESOLVERS, useValue: exports.elementRefResovler, multi: true },
    { provide: injector_1.NODES_RESOLVERS, useValue: exports.templateRefResovler, multi: true },
    { provide: injector_1.NODES_RESOLVERS, useValue: exports.directorRefResovler, multi: true },
    { provide: injector_1.NODES_RESOLVERS, useValue: exports.componentRefResovler, multi: true },
    { provide: injector_1.NODES_RESOLVERS, useValue: exports.viewContainerRefResovler, multi: true },
    { provide: injector_1.NODES_RESOLVERS, useValue: exports.directorResovler, multi: true },
];
//# sourceMappingURL=resolvers.js.map