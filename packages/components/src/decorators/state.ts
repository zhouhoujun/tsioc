import { MethodPropDecorator, PropertyMetadata, createDecorator } from '@tsdi/ioc';



export interface StateMetadata<T = any> extends PropertyMetadata<T> {
    alias?: string;
}

export interface State {
    (alias?: string): MethodPropDecorator;
    (options?: Omit<StateMetadata, 'propertyKey'|'mutil'>): MethodPropDecorator;
}

export const State: State = createDecorator<StateMetadata>('State', {
    props: (alias?: string) => {
        return {
            alias
        };
    }
})

