import { Abstract } from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';

@Abstract()
export abstract class ViewBuilder {
    protected abstract effect: ReactiveEffect;
    
    abstract create(
        selector: string, 
        template: string | DocumentFragment,
        context?: Record<string, any>
    ): Element;

    abstract update(
        view: Element, 
        changes: Record<string, any>,
        context?: Record<string, any>
    ): void;
}
