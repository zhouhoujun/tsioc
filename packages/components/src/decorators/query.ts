import { AbstractType, MethodPropDecorator, PropertyMetadata, Type, createDecorator } from '@tsdi/ioc';
import { ComponentRef } from '../refs/component';
import { DirectiveRef } from '../refs/directive';
import { ElementRef } from '../refs/element';
import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';

export type ViewChildSelector = string | AbstractType;
export type ViewChildReadToken =
    | Type<any>
    | typeof ElementRef
    | typeof TemplateRef
    | typeof ComponentRef
    | typeof DirectiveRef
    | typeof ViewContainerRef;

export interface ViewChildMetadata<T = any> extends PropertyMetadata<T> {
    selector?: ViewChildSelector;
    read?: ViewChildReadToken;
}

export interface ViewChildrenMetadata<T = any> extends PropertyMetadata<T> {
    selector?: ViewChildSelector;
    read?: ViewChildReadToken;
}

export interface ViewChild {
    (selector?: ViewChildSelector, read?: ViewChildReadToken): MethodPropDecorator;
    (options?: Omit<ViewChildMetadata, 'propertyKey' | 'mutil'>): MethodPropDecorator;
}

export interface ViewChildren {
    (selector?: ViewChildSelector, read?: ViewChildReadToken): MethodPropDecorator;
    (options?: Omit<ViewChildrenMetadata, 'propertyKey' | 'mutil'>): MethodPropDecorator;
}

export interface ContentChildMetadata<T = any> extends PropertyMetadata<T> {
    selector?: ViewChildSelector;
    read?: ViewChildReadToken;
}

export interface ContentChildrenMetadata<T = any> extends PropertyMetadata<T> {
    selector?: ViewChildSelector;
    read?: ViewChildReadToken;
}

export interface ContentChild {
    (selector?: ViewChildSelector, read?: ViewChildReadToken): MethodPropDecorator;
    (options?: Omit<ContentChildMetadata, 'propertyKey' | 'mutil'>): MethodPropDecorator;
}

export interface ContentChildren {
    (selector?: ViewChildSelector, read?: ViewChildReadToken): MethodPropDecorator;
    (options?: Omit<ContentChildrenMetadata, 'propertyKey' | 'mutil'>): MethodPropDecorator;
}

export const ViewChild: ViewChild = createDecorator<ViewChildMetadata>('ViewChild', {
    props: (selector?: ViewChildSelector | Omit<ViewChildMetadata, 'propertyKey' | 'mutil'>, read?: ViewChildReadToken) => {
        if (selector && typeof selector === 'object' && !('prototype' in selector)) {
            return selector as ViewChildMetadata;
        }
        return {
            selector: selector as ViewChildSelector | undefined,
            read,
            nullable: true
        };
    }
});

export const ViewChildren: ViewChildren = createDecorator<ViewChildrenMetadata>('ViewChildren', {
    props: (selector?: ViewChildSelector | Omit<ViewChildrenMetadata, 'propertyKey' | 'mutil'>, read?: ViewChildReadToken) => {
        if (selector && typeof selector === 'object' && !('prototype' in selector)) {
            return selector as ViewChildrenMetadata;
        }
        return {
            selector: selector as ViewChildSelector | undefined,
            read,
            nullable: true
        };
    }
});

export const ContentChild: ContentChild = createDecorator<ContentChildMetadata>('ContentChild', {
    props: (selector?: ViewChildSelector | Omit<ContentChildMetadata, 'propertyKey' | 'mutil'>, read?: ViewChildReadToken) => {
        if (selector && typeof selector === 'object' && !('prototype' in selector)) {
            return selector as ContentChildMetadata;
        }
        return {
            selector: selector as ViewChildSelector | undefined,
            read,
            nullable: true
        };
    }
});

export const ContentChildren: ContentChildren = createDecorator<ContentChildrenMetadata>('ContentChildren', {
    props: (selector?: ViewChildSelector | Omit<ContentChildrenMetadata, 'propertyKey' | 'mutil'>, read?: ViewChildReadToken) => {
        if (selector && typeof selector === 'object' && !('prototype' in selector)) {
            return selector as ContentChildrenMetadata;
        }
        return {
            selector: selector as ViewChildSelector | undefined,
            read,
            nullable: true
        };
    }
});
