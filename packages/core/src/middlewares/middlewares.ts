import { Abstract, AsyncHandler, chain, Type, TypeRef } from '@tsdi/ioc';
import { Context } from './context';
import { Middleware, MiddlewareRef } from './middleware';

 
 /**
  * message type for register in {@link Middlewares}.
  */
 export type MiddlewareType = AsyncHandler<Context> | Middleware | MiddlewareRef;
 
 
 /**
  * middlewares, compose of {@link Middleware}.
  */
 @Abstract()
 export abstract class Middlewares<T extends Context = Context> extends Middleware<T> {
     protected befores: MiddlewareType[] = [];
     protected afters: MiddlewareType[] = [];
     protected handles: MiddlewareType[] = [];
     /**
      * use handle.
      *
      * @param {MiddlewareType} handle
      * @returns {this}
      */
     use(...handles: MiddlewareType[]): this {
         handles.forEach(handle => {
             if (this.has(handle)) return;
             this.handles.push(handle);
         });
         return this;
     }
 
     unuse(...handles: (MiddlewareType | Type)[]) {
         this.befores = this.filter(this.befores, handles);
         this.handles = this.filter(this.handles, handles);
         this.afters = this.filter(this.afters, handles);
         return this;
     }
 
     protected filter(target: MiddlewareType[], source: (MiddlewareType | Type)[]) {
         return target.filter(h => source.some(uh => this.equals(h, uh)));
     }
 
     has(handle: MiddlewareType | Type): boolean {
         return this.befores.some(h => this.equals(h, handle))
             || this.handles.some(h => this.equals(h, handle))
             || this.afters.some(h => this.equals(h, handle));
     }
 
     /**
      * use handle before
      *
      * @param {MiddlewareType} handle
      * @param {MiddlewareType} before
      * @returns {this}
      */
     useBefore(handle: MiddlewareType): this {
         if (this.has(handle)) {
             return this;
         }
         this.befores.push(handle);
         return this;
     }
     /**
      * use handle after.
      *
      * @param {MiddlewareType} handle
      * @param {MiddlewareType} after
      * @returns {this}
      */
     useAfter(handle: MiddlewareType): this {
         if (this.has(handle)) {
             return this;
         }
         this.afters.push(handle);
         return this;
     }
 
     override handle(ctx: T, next?: () => Promise<void>): Promise<void> {
         return chain([...this.befores, ...this.handles, ...this.afters], ctx, next);
     }
 
     protected equals(hd: MiddlewareType, hd2: MiddlewareType | Type) {
         if (hd === hd2) return true;
         if (hd instanceof TypeRef) {
             return hd2 instanceof TypeRef ? hd.type === hd2.type : hd.type === hd2;
         }
         return false;
     }
 }
 