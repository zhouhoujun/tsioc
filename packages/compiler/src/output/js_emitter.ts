/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */


 import {AbstractEmitterVisitor, CATCH_ERROR_VAR, CATCH_STACK_VAR, EmitterVisitorContext, escapeIdentifier, OutputEmitter} from './emitter';
 import * as o from './ast';
 
 /**
  * In TypeScript, tagged template functions expect a "template object", which is an array of
  * "cooked" strings plus a `raw` property that contains an array of "raw" strings. This is
  * typically constructed with a function called `__makeTemplateObject(cooked, raw)`, but it may not
  * be available in all environments.
  *
  * This is a JavaScript polyfill that uses __makeTemplateObject when it's available, but otherwise
  * creates an inline helper with the same functionality.
  *
  * In the inline function, if `Object.defineProperty` is available we use that to attach the `raw`
  * array.
  */
 const makeTemplateObjectPolyfill =
     '(this&&this.__makeTemplateObject||function(e,t){return Object.defineProperty?Object.defineProperty(e,"raw",{value:t}):e.raw=t,e})';
 
 export abstract class AbstractJsEmitterVisitor extends AbstractEmitterVisitor {
   constructor() {
     super(false);
   }
   override visitDeclareClassStmt(stmt: o.ClassStmt, ctx: EmitterVisitorContext): any {
     ctx.pushClass(stmt);
     this._visitClassConstructor(stmt, ctx);
 
     if (stmt.parent != null) {
       ctx.print(stmt, `${stmt.name}.prototype = Object.create(`);
       stmt.parent.visitExpression(this, ctx);
       ctx.println(stmt, `.prototype);`);
     }
     stmt.getters.forEach((getter) => this._visitClassGetter(stmt, getter, ctx));
     stmt.methods.forEach((method) => this._visitClassMethod(stmt, method, ctx));
     ctx.popClass();
     return null;
   }
 
   private _visitClassConstructor(stmt: o.ClassStmt, ctx: EmitterVisitorContext) {
     ctx.print(stmt, `function ${stmt.name}(`);
     if (stmt.constructorMethod != null) {
       this._visitParams(stmt.constructorMethod.params, ctx);
     }
     ctx.println(stmt, `) {`);
     ctx.incIndent();
     if (stmt.constructorMethod != null) {
       if (stmt.constructorMethod.body.length > 0) {
         ctx.println(stmt, `var self = this;`);
         this.visitAllStatements(stmt.constructorMethod.body, ctx);
       }
     }
     ctx.decIndent();
     ctx.println(stmt, `}`);
   }
 
   private _visitClassGetter(stmt: o.ClassStmt, getter: o.ClassGetter, ctx: EmitterVisitorContext) {
     ctx.println(
         stmt,
         `Object.defineProperty(${stmt.name}.prototype, '${getter.name}', { get: function() {`);
     ctx.incIndent();
     if (getter.body.length > 0) {
       ctx.println(stmt, `var self = this;`);
       this.visitAllStatements(getter.body, ctx);
     }
     ctx.decIndent();
     ctx.println(stmt, `}});`);
   }
 
   private _visitClassMethod(stmt: o.ClassStmt, method: o.ClassMethod, ctx: EmitterVisitorContext) {
     ctx.print(stmt, `${stmt.name}.prototype.${method.name} = function(`);
     this._visitParams(method.params, ctx);
     ctx.println(stmt, `) {`);
     ctx.incIndent();
     if (method.body.length > 0) {
       ctx.println(stmt, `var self = this;`);
       this.visitAllStatements(method.body, ctx);
     }
     ctx.decIndent();
     ctx.println(stmt, `};`);
   }
 
   override visitWrappedNodeExpr(ast: o.WrappedNodeExpr<any>, ctx: EmitterVisitorContext): any {
     throw new Error('Cannot emit a WrappedNodeExpr in Javascript.');
   }
 
   override visitReadVarExpr(ast: o.ReadVarExpr, ctx: EmitterVisitorContext): string|null {
     if (ast.builtin === o.BuiltinVar.This) {
       ctx.print(ast, 'self');
     } else if (ast.builtin === o.BuiltinVar.Super) {
       throw new Error(
           `'super' needs to be handled at a parent ast node, not at the variable level!`);
     } else {
       super.visitReadVarExpr(ast, ctx);
     }
     return null;
   }
   override visitDeclareVarStmt(stmt: o.DeclareVarStmt, ctx: EmitterVisitorContext): any {
     ctx.print(stmt, `var ${stmt.name}`);
     if (stmt.value) {
       ctx.print(stmt, ' = ');
       stmt.value.visitExpression(this, ctx);
     }
     ctx.println(stmt, `;`);
     return null;
   }
   override visitCastExpr(ast: o.CastExpr, ctx: EmitterVisitorContext): any {
     ast.value.visitExpression(this, ctx);
     return null;
   }
   override visitInvokeFunctionExpr(expr: o.InvokeFunctionExpr, ctx: EmitterVisitorContext): string
       |null {
     const fnExpr = expr.fn;
     if (fnExpr instanceof o.ReadVarExpr && fnExpr.builtin === o.BuiltinVar.Super) {
       ctx.currentClass!.parent!.visitExpression(this, ctx);
       ctx.print(expr, `.call(this`);
       if (expr.args.length > 0) {
         ctx.print(expr, `, `);
         this.visitAllExpressions(expr.args, ctx, ',');
       }
       ctx.print(expr, `)`);
     } else {
       super.visitInvokeFunctionExpr(expr, ctx);
     }
     return null;
   }
   override visitTaggedTemplateExpr(ast: o.TaggedTemplateExpr, ctx: EmitterVisitorContext): any {
     // The following convoluted piece of code is effectively the downlevelled equivalent of
     // ```
     // tag`...`
     // ```
     // which is effectively like:
     // ```
     // tag(__makeTemplateObject(cooked, raw), expression1, expression2, ...);
     // ```
     const elements = ast.template.elements;
     ast.tag.visitExpression(this, ctx);
     ctx.print(ast, `(${makeTemplateObjectPolyfill}(`);
     ctx.print(ast, `[${elements.map(part => escapeIdentifier(part.text, false)).join(', ')}], `);
     ctx.print(ast, `[${elements.map(part => escapeIdentifier(part.rawText, false)).join(', ')}])`);
     ast.template.expressions.forEach(expression => {
       ctx.print(ast, ', ');
       expression.visitExpression(this, ctx);
     });
     ctx.print(ast, ')');
     return null;
   }
   override visitFunctionExpr(ast: o.FunctionExpr, ctx: EmitterVisitorContext): any {
     ctx.print(ast, `function${ast.name ? ' ' + ast.name : ''}(`);
     this._visitParams(ast.params, ctx);
     ctx.println(ast, `) {`);
     ctx.incIndent();
     this.visitAllStatements(ast.statements, ctx);
     ctx.decIndent();
     ctx.print(ast, `}`);
     return null;
   }
   override visitDeclareFunctionStmt(stmt: o.DeclareFunctionStmt, ctx: EmitterVisitorContext): any {
     ctx.print(stmt, `function ${stmt.name}(`);
     this._visitParams(stmt.params, ctx);
     ctx.println(stmt, `) {`);
     ctx.incIndent();
     this.visitAllStatements(stmt.statements, ctx);
     ctx.decIndent();
     ctx.println(stmt, `}`);
     return null;
   }
   override visitTryCatchStmt(stmt: o.TryCatchStmt, ctx: EmitterVisitorContext): any {
     ctx.println(stmt, `try {`);
     ctx.incIndent();
     this.visitAllStatements(stmt.bodyStmts, ctx);
     ctx.decIndent();
     ctx.println(stmt, `} catch (${CATCH_ERROR_VAR.name}) {`);
     ctx.incIndent();
     const catchStmts =
         [<o.Statement>CATCH_STACK_VAR.set(CATCH_ERROR_VAR.prop('stack')).toDeclStmt(null, [
           o.StmtModifier.Final
         ])].concat(stmt.catchStmts);
     this.visitAllStatements(catchStmts, ctx);
     ctx.decIndent();
     ctx.println(stmt, `}`);
     return null;
   }

   private _visitParams(params: o.FnParam[], ctx: EmitterVisitorContext): void {
     this.visitAllObjects(param => ctx.print(null, param.name), params, ctx, ',');
   }
 
   override getBuiltinMethodName(method: o.BuiltinMethod): string {
     let name: string;
     switch (method) {
       case o.BuiltinMethod.ConcatArray:
         name = 'concat';
         break;
       case o.BuiltinMethod.SubscribeObservable:
         name = 'subscribe';
         break;
       case o.BuiltinMethod.Bind:
         name = 'bind';
         break;
       default:
         throw new Error(`Unknown builtin method: ${method}`);
     }
     return name;
   }
 }
 

 
export class JavaScriptEmitter implements OutputEmitter {
    emitStatements(genFilePath: string, stmts: o.Statement[], preamble: string = ''): string {
      const converter = new JsEmitterVisitor();
      const ctx = EmitterVisitorContext.createRoot();
      converter.visitAllStatements(stmts, ctx);
  
      const preambleLines = preamble ? preamble.split('\n') : [];
      converter.importsWithPrefixes.forEach((prefix, importedModuleName) => {
        // Note: can't write the real word for import as it screws up system.js auto detection...
        preambleLines.push(
            `var ${prefix} = req` +
            `uire('${importedModuleName}');`);
      });
  
      const sm = ctx.toSourceMapGenerator(genFilePath, preambleLines.length).toJsComment();
      const lines = [...preambleLines, ctx.toSource(), sm];
      if (sm) {
        // always add a newline at the end, as some tools have bugs without it.
        lines.push('');
      }
      return lines.join('\n');
    }
  }
  
  class JsEmitterVisitor extends AbstractJsEmitterVisitor {
    importsWithPrefixes = new Map<string, string>();
  
    override visitExternalExpr(ast: o.ExternalExpr, ctx: EmitterVisitorContext): any {
      const {name, moduleName} = ast.value;
      if (moduleName) {
        let prefix = this.importsWithPrefixes.get(moduleName);
        if (prefix == null) {
          prefix = `i${this.importsWithPrefixes.size}`;
          this.importsWithPrefixes.set(moduleName, prefix);
        }
        ctx.print(ast, `${prefix}.`);
      }
      ctx.print(ast, name!);
      return null;
    }
    override visitDeclareVarStmt(stmt: o.DeclareVarStmt, ctx: EmitterVisitorContext): any {
      super.visitDeclareVarStmt(stmt, ctx);
      if (stmt.hasModifier(o.StmtModifier.Exported)) {
        ctx.println(stmt, exportVar(stmt.name));
      }
      return null;
    }
    override visitDeclareFunctionStmt(stmt: o.DeclareFunctionStmt, ctx: EmitterVisitorContext): any {
      super.visitDeclareFunctionStmt(stmt, ctx);
      if (stmt.hasModifier(o.StmtModifier.Exported)) {
        ctx.println(stmt, exportVar(stmt.name));
      }
      return null;
    }
    override visitDeclareClassStmt(stmt: o.ClassStmt, ctx: EmitterVisitorContext): any {
      super.visitDeclareClassStmt(stmt, ctx);
      if (stmt.hasModifier(o.StmtModifier.Exported)) {
        ctx.println(stmt, exportVar(stmt.name));
      }
      return null;
    }
  }
  
  function exportVar(varName: string): string {
    return `Object.defineProperty(exports, '${varName}', { get: function() { return ${varName}; }});`;
  }
  