/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

//  import {Component} from './core';
 import { hasOwn } from '@tsdi/ioc';
import * as o from './output/ast';
 
 /**
  * Provides access to reflection data about symbols that the compiler needs.
  */
 export abstract class CompileReflector {
   abstract parameters(typeOrFunc: /*Type*/ any): any[][];
   abstract annotations(typeOrFunc: /*Type*/ any): any[];
   abstract shallowAnnotations(typeOrFunc: /*Type*/ any): any[];
   abstract tryAnnotations(typeOrFunc: /*Type*/ any): any[];
   abstract propMetadata(typeOrFunc: /*Type*/ any): {[key: string]: any[]};
   abstract hasLifecycleHook(type: any, lcProperty: string): boolean;
   abstract guards(typeOrFunc: /* Type */ any): {[key: string]: any};
//    abstract componentModuleUrl(type: /*Type*/ any, cmpMetadata: Component): string;
   abstract resolveExternalReference(ref: o.ExternalReference): any;
 }
 

 
/**
 * Implementation of `CompileReflector` which resolves references to @tsdi/components
 * symbols at runtime, according to a consumer-provided mapping.
 *
 * Only supports `resolveExternalReference`, all other methods throw.
 */
export class JitReflector implements CompileReflector {
  constructor(private context: {[key: string]: any}) {}

  resolveExternalReference(ref: o.ExternalReference): any {
    // This reflector only handles @tsdi/components imports.
    if (ref.moduleName !== '@tsdi/components') {
      throw new Error(`Cannot resolve external reference to ${
          ref.moduleName}, only references to @tsdi/components are supported.`);
    }
    if (!hasOwn(this.context, ref.name!)) {
      throw new Error(`No value provided for @tsdi/components symbol '${ref.name!}'.`);
    }
    return this.context[ref.name!];
  }

  parameters(typeOrFunc: any): any[][] {
    throw new Error('Not implemented.');
  }

  annotations(typeOrFunc: any): any[] {
    throw new Error('Not implemented.');
  }

  shallowAnnotations(typeOrFunc: any): any[] {
    throw new Error('Not implemented.');
  }

  tryAnnotations(typeOrFunc: any): any[] {
    throw new Error('Not implemented.');
  }

  propMetadata(typeOrFunc: any): {[key: string]: any[];} {
    throw new Error('Not implemented.');
  }

  hasLifecycleHook(type: any, lcProperty: string): boolean {
    throw new Error('Not implemented.');
  }

  guards(typeOrFunc: any): {[key: string]: any;} {
    throw new Error('Not implemented.');
  }

  componentModuleUrl(type: any, cmpMetadata: any): string {
    throw new Error('Not implemented.');
  }
}
