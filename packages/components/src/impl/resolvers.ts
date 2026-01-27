import { AbstractType, ResolveInterceptorFn, isBaseOf, getDef, Provider, Type, isNumber } from '@tsdi/ioc';
import { EnvironmentContext, NODES_RESOLVERS } from '../refs/environment';
import { ElementRef } from '../refs/element';
import { TemplateRef } from '../refs/template';
import { DirectiveDef, DirectiveRef, DirectiveType } from '../refs/directive';
import { ComponentRef } from '../refs/component';
import { ViewContainerRef } from '../refs/container';
import { Renderer } from '../renderer/Renderer';

export const elementRefResovler: ResolveInterceptorFn = (input, next, context) => {
    const paramType = (input.provider ?? input.type) as AbstractType;
    if (paramType === ElementRef || isBaseOf(paramType, ElementRef)) {
        return context.getPayload();
    }

    return next(input, context);
}

export const templateRefResovler: ResolveInterceptorFn = (input, next, context) => {
    const paramType = (input.provider ?? input.type) as AbstractType;
    if (paramType === TemplateRef || isBaseOf(paramType, TemplateRef)) {
        const environment = context.getInjector() as EnvironmentContext;
        const elementRef = context.getPayload() as ElementRef;
        return environment.getTemplateRef(elementRef.nativeElement, input.flags)
    }

    return next(input, context);
}

export const directorRefResovler: ResolveInterceptorFn = (input, next, context) => {
    const paramType = (input.provider ?? input.type) as AbstractType;
    if (paramType === DirectiveRef || isBaseOf(paramType, DirectiveRef)) {
        const environment = context.getInjector() as EnvironmentContext;
        const elementRef = context.getPayload() as ElementRef;
        return environment.getDirectiveRefByNode(elementRef.nativeElement, input.flags)
    }

    return next(input, context);
}

export const componentRefResovler: ResolveInterceptorFn = (input, next, context) => {
    const paramType = (input.provider ?? input.type) as AbstractType;
    if (paramType === ComponentRef || isBaseOf(paramType, ComponentRef)) {
        const environment = context.getInjector() as EnvironmentContext;
        const elementRef = context.getPayload() as ElementRef;
        return environment.getComponentRefByNode(elementRef.nativeElement, input.flags)
    }

    return next(input, context);
}


export const viewContainerRefResovler: ResolveInterceptorFn = (input, next, context) => {
    const paramType = (input.provider ?? input.type) as AbstractType;
    if (paramType === ViewContainerRef || isBaseOf(paramType, ViewContainerRef)) {
        const environment = context.getInjector() as EnvironmentContext;
        const elementRef = context.getPayload() as ElementRef;
        return environment.getViewContainerRef(elementRef.nativeElement, input.flags)
    }

    return next(input, context);
}


export const directorResovler: ResolveInterceptorFn = (input, next, context) => {
    const paramType = (input.provider ?? input.type) as Type;
    const dirDef = getDef<DirectiveDef>(paramType);
    const dirType = dirDef?.dirType;
    if (isNumber(dirType)) {
        const environment = context.getInjector() as EnvironmentContext;
        const renderer = environment.get(Renderer);
        const elementRef = context.getPayload() as ElementRef;
        if(dirDef.selector) {
            const node = renderer.querySelector(elementRef.nativeElement, dirDef.selector);
            // const dirRef  environment.getDirectiveRefByNode(node, dirType, input.flags);
        }
        if(dirType === DirectiveType.Component) {
            return environment.getComponentRef(paramType, input.flags);
        }
        return environment.getDirectiveRef(paramType, input.flags);
    }

    return next(input, context);
}

export const componentResolvers: Provider[] = [
    { provide: NODES_RESOLVERS, useValue: elementRefResovler, multi: true },
    { provide: NODES_RESOLVERS, useValue: templateRefResovler, multi: true },
    { provide: NODES_RESOLVERS, useValue: directorRefResovler, multi: true },
    { provide: NODES_RESOLVERS, useValue: componentRefResovler, multi: true },
    { provide: NODES_RESOLVERS, useValue: viewContainerRefResovler, multi: true },
    { provide: NODES_RESOLVERS, useValue: directorResovler, multi: true },
];
