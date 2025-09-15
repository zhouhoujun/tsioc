import { PropertyMetadata, MethodPropDecorator, createDecorator } from '@tsdi/ioc';

/**
 * Computed metadata
 */
export interface ComputedMetadata<T = any> extends PropertyMetadata {
    alias?: string;
    required?: boolean;
    /**
     * compute expression or function
     */
    compute?: string | ((instance: T) => any);
    /**
     * watch dependencies
     */
    dependencies?: string[];
    /**
     * cache computed result
     */
    cache?: boolean;
}

/**
 * Computed decorator interface
 */
export interface Computed {
    /**
     * Computed decorator
     * @param dependencies dependencies properties
     * @param cache cache result
     */
    (dependencies?: string[], cache?: boolean): MethodPropDecorator;
    /**
     * Computed decorator with metadata
     * @param metadata computed metadata
     */
    <T>(metadata: Omit<ComputedMetadata<T>, 'propertyKey'| 'mutil'>): MethodPropDecorator;
}

/**
 * Computed decorator, define for property.
 * use to define class property as computed property.
 * @Computed
 */
export const Computed: Computed = createDecorator<ComputedMetadata>('Computed', {
    props: (dependencies?: string[] | ComputedMetadata, cache = true) => {
        if (Array.isArray(dependencies)) {
            return {
                dependencies,
                cache
            };
        } else if (dependencies && typeof dependencies === 'object') {
            return dependencies;
        }
        return { cache };
    }
});