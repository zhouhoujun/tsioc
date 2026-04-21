import { ReactiveEffect } from './effect';
import { ComputedMetadata } from './decorators/computed';
export declare function isReactive(target: any): boolean;
export declare function canReactive(target: any): boolean;
export declare function reactive(target: any, effect: ReactiveEffect, computeds?: ComputedMetadata[]): any;
