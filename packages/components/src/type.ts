import { Type } from '@tsdi/ioc';

export interface ComponentType<T = any> extends Type<T> {
    /**
     * get component def.
     */
    ρcmp?(...args: any[]): any;
}

export interface DirectiveType<T = any> extends Type<T> {
    /**
     * get directive def.
     */
    ρdir?(...args: any[]): any;
}

