import { Type } from '@tsdi/ioc';

/**
 * component type.
 */
export interface ComponentType<T = any> extends Type<T> {
    /**
     * get component def.
     */
    ρcmp: never;
}

/**
 * directive type.
 */
export interface DirectiveType<T = any> extends Type<T> {
    /**
     * get directive def.
     */
    ρdir: never;
}

