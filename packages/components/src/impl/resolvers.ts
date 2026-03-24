import { AbstractType, ResolveInterceptorFn, isBaseOf, getDef, Provider, Type, isNumber, UNRESOLVED, InjectFlags } from '@tsdi/ioc';
import { NodeInjector, NODES_RESOLVERS } from '../refs/injector';
import { ElementRef } from '../refs/element';
import { TemplateRef } from '../refs/template';
import { DirectiveDef, DirectiveRef, DirectiveType, Factoriable } from '../refs/directive';
import { ComponentRef, ComponentDef } from '../refs/component';
import { ViewContainerRef } from '../refs/container';
import { Renderer } from '../renderer/Renderer';
import { DIRECTIVES, BINDINGS, COMPONENTDEF } from '../renderer/Node';

export const elementRefResovler: ResolveInterceptorFn = (input, next, context) => {
    const paramType = (input.provider ?? input.type) as AbstractType;
    if (paramType === ElementRef || isBaseOf(paramType, ElementRef)) {
        return (context.getInjector() as NodeInjector).getPayload();
    }

    return next(input, context);
}

export const templateRefResovler: ResolveInterceptorFn = (input, next, context) => {
    const paramType = (input.provider ?? input.type) as AbstractType;
    if (paramType === TemplateRef || isBaseOf(paramType, TemplateRef)) {
        const injector = context.getInjector() as NodeInjector;
        const elementRef = injector.getPayload() as ElementRef;
        let templateRef = injector.getTemplateRef(elementRef.nativeElement, input.flags);
        
        if (!templateRef) {
            templateRef = createAndAttachDirectiveForNode(injector, elementRef.nativeElement);
        }
        
        return templateRef ?? UNRESOLVED;
    }

    return next(input, context);
}

export const directorRefResovler: ResolveInterceptorFn = (input, next, context) => {
    const paramType = (input.provider ?? input.type) as AbstractType;
    if (paramType === DirectiveRef || isBaseOf(paramType, DirectiveRef)) {
        const injector = context.getInjector() as NodeInjector;
        const elementRef = injector.getPayload() as ElementRef;
        return injector.getDirectiveRefByNode(elementRef.nativeElement, input.flags) ?? UNRESOLVED;
    }

    return next(input, context);
}

export const componentRefResovler: ResolveInterceptorFn = (input, next, context) => {
    const paramType = (input.provider ?? input.type) as AbstractType;
    if (paramType === ComponentRef || isBaseOf(paramType, ComponentRef)) {
        const injector = context.getInjector() as NodeInjector;
        const elementRef = injector.getPayload() as ElementRef;
        return injector.getComponentRefByNode(elementRef.nativeElement, input.flags) ?? UNRESOLVED;
    }

    return next(input, context);
}

function createAndAttachDirectiveForNode(injector: NodeInjector, node: any): TemplateRef<any> | null {
    const directives = node[DIRECTIVES] as DirectiveDef[] | undefined;
    if (!directives || directives.length === 0) {
        return injector.getTemplateRef(node);
    }
    
    for (const dirDef of directives) {
        if (dirDef.dirType === DirectiveType.Iterable || dirDef.dirType === DirectiveType.Conditional) {
            let dirRef = injector.getDirectiveRefByNode(node);
            if (!dirRef) {
                const elementRef = injector.getElementRef(node);
                dirRef = (dirDef as Factoriable).ƿfac?.(injector, { elementRef });
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

function createAndAttachComponentForNode(injector: NodeInjector, node: any): ComponentRef<any> | null {
    const compDef = node[COMPONENTDEF] as ComponentDef | undefined;
    if (!compDef) {
        return null;
    }
    
    let compRef = injector.getComponentRefByNode(node);
    if (!compRef) {
        const elementRef = injector.getElementRef(node);
        compRef = (compDef as Factoriable).ƿfac?.(injector, { elementRef }) as ComponentRef<any>;
        if (compRef) {
            injector.attachComponent(compRef);
        }
    }
    return compRef;
}

export const viewContainerRefResovler: ResolveInterceptorFn = (input, next, context) => {
    const paramType = (input.provider ?? input.type) as AbstractType;
    if (paramType === ViewContainerRef || isBaseOf(paramType, ViewContainerRef)) {
        const injector = context.getInjector() as NodeInjector;
        const elementRef = injector.getPayload() as ElementRef;
        
        const containerRef = injector.getViewContainerRef(elementRef.nativeElement, input.flags);
        if (containerRef) {
            return containerRef;
        }
        
        return injector.createViewContainerRef(elementRef.nativeElement) ?? UNRESOLVED;
    }

    return next(input, context);
}


export const hostDirectiveResovler: ResolveInterceptorFn = (input, next, context) => {
    const paramType = (input.provider ?? input.type) as Type;
    
    if (input.flags && (input.flags & InjectFlags.Host)) {
        const injector = context.getInjector() as NodeInjector;
        const elementRef = injector.getPayload() as ElementRef;
        
        if (elementRef?.nativeElement) {
            const dirDef = getDef<DirectiveDef>(paramType);
            const dirType = dirDef?.dirType;

            if (isNumber(dirType) || paramType.name === 'SwitchDirective') {
                const node = elementRef?.nativeElement;

                const searchForDirective = (searchNode: any, depth = 0): any => {
                    const dirRefsOnNode = injector.getDirectiveRefsByNode(searchNode);
                    // console.log('[hostDirectiveResovler] Searching in node:', (searchNode as any)?.tagName, 'dirRefs:', dirRefsOnNode?.map((r: any) => r?.instance?.constructor?.name));
                    if (dirRefsOnNode) {
                        for (const dirRef of dirRefsOnNode) {
                            try {
                                if (dirRef.instance instanceof paramType) {
                                    // console.log('[hostDirectiveResovler] Found SwitchDirective:', dirRef.instance);
                                    return dirRef.instance;
                                }
                            } catch (e) {
                                // Directive instantiation failed, skip
                            }
                        }
                    }
                    
                    if (searchNode.childNodes && depth < 10) {
                        for (const child of searchNode.childNodes) {
                            if (child !== node && child !== undefined) {
                                const result = searchForDirective(child, depth + 1);
                                if (result) return result;
                            }
                        }
                    }
                    return null;
                };

                const storedParent = injector.getParentNode(node);
                // console.log('[hostDirectiveResovler] Searching for SwitchDirective, node tagName:', (node as any)?.tagName, 'storedParent:', (storedParent as any)?.tagName);
                
                // For v-case, search in the same container (storedParent) since v-switch is on the parent element
                if (storedParent) {
                    // console.log('[hostDirectiveResovler] Searching in storedParent');
                    const result = searchForDirective(storedParent, 0);
                    if (result) return result;
                }

                let hostNode = node.parentNode as typeof node;
                while (hostNode) {
                    // console.log('[hostDirectiveResovler] Searching in hostNode:', (hostNode as any)?.tagName);
                    const result = searchForDirective(hostNode, 0);
                    if (result) return result;
                    hostNode = hostNode.parentNode as typeof node;
                }
            }
        }
    }

    return next(input, context);
}

export const directorResovler: ResolveInterceptorFn = (input, next, context) => {
    const paramType = (input.provider ?? input.type) as Type;
    const dirDef = getDef<DirectiveDef>(paramType);
    const dirType = dirDef?.dirType;
    if (isNumber(dirType)) {
        const injector = context.getInjector() as NodeInjector;
        const renderer = injector.get(Renderer);
        const elementRef = injector.getPayload() as ElementRef;
        
        if(dirType === DirectiveType.Component) {
            const compRefs = injector.getComponentRef(paramType, input.flags);
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
            return compRef ?? UNRESOLVED;
        }
        const dirRefs = injector.getDirectiveRef(paramType, input.flags);
        return dirRefs && dirRefs.length > 0 ? dirRefs[0] : UNRESOLVED;
    }

    return next(input, context);
}

export function resolveDirectiveFromNode(
    injector: NodeInjector,
    node: any,
    directiveType: Type
): DirectiveRef<any> | null {
    const directives = node[DIRECTIVES] as DirectiveDef[] | undefined;
    if (!directives) {
        return null;
    }
    
    for (const dirDef of directives) {
        if (dirDef.type === directiveType) {
            let dirRef = injector.getDirectiveRefByNode(node);
            if (!dirRef) {
                const elementRef = injector.getElementRef(node);
                dirRef = (dirDef as Factoriable).ƿfac?.(injector, { elementRef });
                if (dirRef) {
                    injector.attachDirective(dirRef);
                }
            }
            return dirRef;
        }
    }
    return null;
}

export function resolveComponentFromNode(
    injector: NodeInjector,
    node: any,
    componentType: Type
): ComponentRef<any> | null {
    const compDef = node[COMPONENTDEF] as ComponentDef | undefined;
    if (!compDef || compDef.type !== componentType) {
        return null;
    }
    
    let compRef = injector.getComponentRefByNode(node);
    if (!compRef) {
        const elementRef = injector.getElementRef(node);
        compRef = (compDef as Factoriable).ƿfac?.(injector, { elementRef }) as ComponentRef<any>;
        if (compRef) {
            injector.attachComponent(compRef);
        }
    }
    return compRef;
}

export const componentResolvers: Provider[] = [
    { provide: NODES_RESOLVERS, useValue: elementRefResovler, multi: true },
    { provide: NODES_RESOLVERS, useValue: templateRefResovler, multi: true },
    { provide: NODES_RESOLVERS, useValue: directorRefResovler, multi: true },
    { provide: NODES_RESOLVERS, useValue: componentRefResovler, multi: true },
    { provide: NODES_RESOLVERS, useValue: viewContainerRefResovler, multi: true },
    { provide: NODES_RESOLVERS, useValue: hostDirectiveResovler, multi: true },
    { provide: NODES_RESOLVERS, useValue: directorResovler, multi: true },
];
