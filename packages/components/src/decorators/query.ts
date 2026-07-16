import { AbstractType, MethodPropDecorator, PropertyMetadata, Type, createDecorator } from '@tsdi/ioc';
import { ComponentRef } from '../refs/component';
import { DirectiveRef } from '../refs/directive';
import { ElementRef } from '../refs/element';
import { TemplateRef } from '../refs/template';

export type ViewChildSelector = string | AbstractType;
export type ViewChildReadToken =
    | Type<any>
    | typeof ElementRef
    | typeof TemplateRef
    | typeof ComponentRef
    | typeof DirectiveRef;

export interface ViewChildMetadata<T = any> extends PropertyMetadata<T> {
    selector?: ViewChildSelector;
    read?: ViewChildReadToken;
}

export interface ViewChild {
    (selector?: ViewChildSelector, read?: ViewChildReadToken): MethodPropDecorator;
    (options?: Omit<ViewChildMetadata, 'propertyKey' | 'mutil'>): MethodPropDecorator;
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
