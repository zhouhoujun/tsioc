import { isExtends, AbstractType, ResolveInterceptorFn, isBaseOf, getDef, Provider } from '@tsdi/ioc';
import { EnvironmentContext, NODES_RESOLVERS } from '../refs/environment';
import { ElementRef } from '../refs/element';
import { TemplateRef } from '../refs/template';
import { DirectiveRef } from '../refs/directive';
import { ComponentRef } from '../refs/component';
import { ViewContainerRef } from '../refs/container';

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
        return environment.getTemplateRef(elementRef.nativeElement)
    }

    return next(input, context);
}

export const directorRefResovler: ResolveInterceptorFn = (input, next, context) => {
    const paramType = (input.provider ?? input.type) as AbstractType;
    if (paramType === DirectiveRef || isBaseOf(paramType, DirectiveRef)) {
        const environment = context.getInjector() as EnvironmentContext;
        const elementRef = context.getPayload() as ElementRef;
        return environment.getDirectiveRefByNode(elementRef.nativeElement)
    }

    return next(input, context);
}

export const componentRefResovler: ResolveInterceptorFn = (input, next, context) => {
    const paramType = (input.provider ?? input.type) as AbstractType;
    if (paramType === ComponentRef || isBaseOf(paramType, ComponentRef)) {
        const environment = context.getInjector() as EnvironmentContext;
        const elementRef = context.getPayload() as ElementRef;
        return environment.getComponentRefByNode(elementRef.nativeElement)
    }

    return next(input, context);
}


export const viewContainerRefResovler: ResolveInterceptorFn = (input, next, context) => {
    const paramType = (input.provider ?? input.type) as AbstractType;
    if (paramType === ViewContainerRef || isBaseOf(paramType, ViewContainerRef)) {
        const environment = context.getInjector() as EnvironmentContext;
        const elementRef = context.getPayload() as ElementRef;
        return environment.getViewContainerRef(elementRef.nativeElement)
    }

    return next(input, context);
}


export const directorResovler: ResolveInterceptorFn = (input, next, context) => {
    const paramType = (input.provider ?? input.type) as AbstractType;
    if (getDef(paramType)) {
        const environment = context.getInjector() as EnvironmentContext;
        const elementRef = context.getPayload() as ElementRef;
        return environment.getTemplateRef(context.getPayload())
    }

    return next(input, context);
}

export const componentResolvers: Provider[] = [
    { provide: NODES_RESOLVERS, useValue: elementRefResovler, multi: true },
    { provide: NODES_RESOLVERS, useValue: templateRefResovler, multi: true },
    { provide: NODES_RESOLVERS, useValue: directorRefResovler, multi: true },
    { provide: NODES_RESOLVERS, useValue: componentRefResovler, multi: true },
    { provide: NODES_RESOLVERS, useValue: viewContainerRefResovler, multi: true },
    // { provide: NODES_RESOLVERS, useValue: directorResovler, multi: true },
];
