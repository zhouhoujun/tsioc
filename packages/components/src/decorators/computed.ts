import { MethodPropDecorator, PropertyMetadata, createDecorator } from '@tsdi/ioc';

/**
 * Computed metadata
 */
export interface ComputedMetadata extends PropertyMetadata {
    /**
     * computed getter function
     */
    getter?: () => any;
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
    (metadata: ComputedMetadata): MethodPropDecorator;
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