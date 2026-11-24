import type { AbstractType } from './types';
import type { InvocationOptions } from './context';
import type { ClassRef } from './metadata/class';
import type { Invocation } from './invocation';

/** Invocation factory token/contract (kept separate from `invocation.ts` to break an ESM cycle). */
export abstract class InvocationFactory<TOpts extends InvocationOptions = InvocationOptions> {
    abstract create<T>(type: AbstractType<T> | ClassRef<T>, options?: TOpts): Invocation<T>;
}
