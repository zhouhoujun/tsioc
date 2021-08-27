/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

 import {EmitterVisitorContext} from '../../src/output/emitter';
 import * as o from '../../src/output/ast';
 import {JitEmitterVisitor, JitEvaluator} from '../../src/output/jit';
 import {newArray} from '../../src/util';
import { JitReflector } from '../../src/reflector';
import expect = require('expect');
 
 const anotherModuleUrl = 'somePackage/someOtherPath';
 
 {
   describe('Output JIT', () => {
     describe('regression', () => {
       it('should generate unique argument names', () => {
         const externalIds = newArray(10, 1).map(
             (_, index) =>
                 new o.ExternalReference(anotherModuleUrl, `id_${index}_`, {name: `id_${index}_`}));
         const externalIds1 = newArray(10, 1).map(
             (_, index) => new o.ExternalReference(
                 anotherModuleUrl, `id_${index}_1`, {name: `id_${index}_1`}));
         const ctx = EmitterVisitorContext.createRoot();
         const converter = new JitEmitterVisitor(new JitReflector({}));
         converter.visitAllStatements(
             [o.literalArr([...externalIds1, ...externalIds].map(id => o.importExpr(id))).toStmt()],
             ctx);
         const args = converter.getArgs();
         expect(Object.keys(args).length).toBe(20);
       });
     });
 
     it('should use strict mode', () => {
       const evaluator = new JitEvaluator();
       expect(() => {
         evaluator.evaluateStatements(
             'http://angular.io/something.ts',
             [
               // Set an undeclared variable
               // foo = "bar";
               o.variable('foo').equals(o.literal('bar')).toStmt(),
             ],
             new JitReflector({}), false);
       }).toThrowError();
     });
 
     it('should not add more than one strict mode statement if there is already one present', () => {
       const converter = new JitEmitterVisitor(new JitReflector({}));
       const ctx = EmitterVisitorContext.createRoot();
       converter.visitAllStatements(
           [
             o.literal('use strict').toStmt(),
           ],
           ctx);
       const matches = ctx.toSource().match(/'use strict';/g)!;
       expect(matches.length).toBe(1);
     });
   });
 }
 