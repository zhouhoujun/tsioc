import { ClassMethodDecorator, PropertyMetadata, createDecorator } from '@tsdi/ioc';

/**
 * Marks a member (property / accessor / method) or a class whose access must
 * not establish a reactive dependency. Created through the IoC
 * `createDecorator` factory, so marks live on the ClassRef and are read once by
 * `reactive()` when it builds the proxy.
 */
export interface NoReactiveMetadata<T = any> extends PropertyMetadata<T> {
}

export interface NoReactive {
    (): ClassMethodDecorator;
}

export const NoReactive: NoReactive = createDecorator<NoReactiveMetadata>('NoReactive', {
    props: () => ({})
});
