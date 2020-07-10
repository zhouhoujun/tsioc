/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */


import {CompilerFacade, CoreEnvironment, ExportedCompilerFacade, R3ComponentMetadataFacade, R3DependencyMetadataFacade, R3DirectiveMetadataFacade, R3QueryMetadataFacade, StringMap, StringMapWithRename} from './compiler_facade_interface';
import {ConstantPool} from './constant_pool';
import {DEFAULT_INTERPOLATION_CONFIG, InterpolationConfig} from './ml_parser/interpolation_config';
import {DeclareVarStmt, Expression, LiteralExpr, Statement, StmtModifier, WrappedNodeExpr} from './output/output_ast';
import {JitEvaluator} from './output/output_jit';
import {ParseError, ParseSourceSpan, r3JitTypeSourceSpan} from './parse_util';
import {R3DependencyMetadata, R3FactoryTarget, R3ResolvedDependencyType} from './render/r3_factory';
import {R3Reference} from './render/util';
import {R3DirectiveMetadata, R3QueryMetadata} from './compiler/api';
import {ParsedHostBindings, compileComponentFromMetadata, compileDirectiveFromMetadata, parseHostBindings, verifyHostBindings} from './compiler/compiler';
import {makeBindingParser, parseTemplate} from './compiler/template';
import {DomElementSchemaRegistry} from './schemas';
import { R3JitReflector } from './render/r3_jit';

export class CompilerFacadeImpl implements CompilerFacade {
  R3ResolvedDependencyType = R3ResolvedDependencyType as any;
  R3FactoryTarget = R3FactoryTarget as any;
  private elementSchemaRegistry = new DomElementSchemaRegistry();

  constructor(private jitEvaluator = new JitEvaluator()) {}


  compileDirective(
      angularCoreEnv: CoreEnvironment, sourceMapUrl: string,
      facade: R3DirectiveMetadataFacade): any {
    const constantPool = new ConstantPool();
    const bindingParser = makeBindingParser();

    const meta: R3DirectiveMetadata = convertDirectiveFacadeToMetadata(facade);
    const res = compileDirectiveFromMetadata(meta, constantPool, bindingParser);
    return this.jitExpression(
        res.expression, angularCoreEnv, sourceMapUrl, constantPool.statements);
  }

  compileComponent(
      angularCoreEnv: CoreEnvironment, sourceMapUrl: string,
      facade: R3ComponentMetadataFacade): any {
    // The ConstantPool is a requirement of the JIT'er.
    const constantPool = new ConstantPool();

    const interpolationConfig = facade.interpolation ?
        InterpolationConfig.fromArray(facade.interpolation) :
        DEFAULT_INTERPOLATION_CONFIG;
    // Parse the template and check for errors.
    const template = parseTemplate(
        facade.template, sourceMapUrl,
        {preserveWhitespaces: facade.preserveWhitespaces, interpolationConfig});
    if (template.errors !== undefined) {
      const errors = template.errors.map(err => err.toString()).join(', ');
      throw new Error(`Errors during JIT compilation of template for ${facade.name}: ${errors}`);
    }

    // Compile the component metadata, including template, into an expression.
    // TODO(alxhub): implement inputs, outputs, queries, etc.
    const metadata = {
      ...facade as R3ComponentMetadataFacadeNoPropAndWhitespace,
      ...convertDirectiveFacadeToMetadata(facade),
      selector: facade.selector || this.elementSchemaRegistry.getDefaultComponentElementName(),
      template,
      wrapDirectivesAndPipesInClosure: false,
      styles: [...facade.styles, ...template.styles],
      encapsulation: facade.encapsulation as any,
      interpolation: interpolationConfig,
      changeDetection: facade.changeDetection,
      animations: facade.animations != null ? new WrappedNodeExpr(facade.animations) : null,
      viewProviders: facade.viewProviders != null ? new WrappedNodeExpr(facade.viewProviders) :
                                                    null,
      relativeContextFilePath: '',
      i18nUseExternalIds: true,
    };
    const res = compileComponentFromMetadata(
        metadata, constantPool, makeBindingParser(interpolationConfig));
    const jitExpressionSourceMap = `ng:///${facade.name}.js`;
    return this.jitExpression(
        res.expression, angularCoreEnv, jitExpressionSourceMap, constantPool.statements);
  }

  createParseSourceSpan(kind: string, typeName: string, sourceUrl: string): ParseSourceSpan {
    return r3JitTypeSourceSpan(kind, typeName, sourceUrl);
  }

  /**
   * JIT compiles an expression and returns the result of executing that expression.
   *
   * @param def the definition which will be compiled and executed to get the value to patch
   * @param context an object map of @angular/core symbol names to symbols which will be available
   * in the context of the compiled expression
   * @param sourceUrl a URL to use for the source map of the compiled expression
   * @param preStatements a collection of statements that should be evaluated before the expression.
   */
  private jitExpression(
      def: Expression, context: {[key: string]: any}, sourceUrl: string,
      preStatements: Statement[]): any {
    // The ConstantPool may contain Statements which declare variables used in the final expression.
    // Therefore, its statements need to precede the actual JIT operation. The final statement is a
    // declaration of $def which is set to the expression being compiled.
    const statements: Statement[] = [
      ...preStatements,
      new DeclareVarStmt('$def', def, undefined, [StmtModifier.Exported]),
    ];

    const res = this.jitEvaluator.evaluateStatements(
        sourceUrl, statements, new R3JitReflector(context), /* enableSourceMaps */ true);
    return res['$def'];
  }
}

// This seems to be needed to placate TS v3.0 only
type R3ComponentMetadataFacadeNoPropAndWhitespace = Pick<
    R3ComponentMetadataFacade,
    Exclude<Exclude<keyof R3ComponentMetadataFacade, 'preserveWhitespaces'>, 'propMetadata'>>;

const USE_CLASS = Object.keys({useClass: null})[0];
const USE_FACTORY = Object.keys({useFactory: null})[0];
const USE_VALUE = Object.keys({useValue: null})[0];
const USE_EXISTING = Object.keys({useExisting: null})[0];

const wrapReference = function(value: any): R3Reference {
  const wrapped = new WrappedNodeExpr(value);
  return {value: wrapped, type: wrapped};
};

function convertToR3QueryMetadata(facade: R3QueryMetadataFacade): R3QueryMetadata {
  return {
    ...facade,
    predicate: Array.isArray(facade.predicate) ? facade.predicate :
                                                 new WrappedNodeExpr(facade.predicate),
    read: facade.read ? new WrappedNodeExpr(facade.read) : null,
    static: facade.static
  };
}

function convertDirectiveFacadeToMetadata(facade: R3DirectiveMetadataFacade): R3DirectiveMetadata {
  const inputsFromMetadata = parseInputOutputs(facade.inputs || []);
  const outputsFromMetadata = parseInputOutputs(facade.outputs || []);
  const propMetadata = facade.propMetadata;
  const inputsFromType: StringMapWithRename = {};
  const outputsFromType: StringMap = {};
  for (const field in propMetadata) {
    if (propMetadata.hasOwnProperty(field)) {
      propMetadata[field].forEach(ann => {
        if (isInput(ann)) {
          inputsFromType[field] =
              ann.bindingPropertyName ? [ann.bindingPropertyName, field] : field;
        } else if (isOutput(ann)) {
          outputsFromType[field] = ann.bindingPropertyName || field;
        }
      });
    }
  }

  return {
    ...facade as R3DirectiveMetadataFacadeNoPropAndWhitespace,
    typeSourceSpan: facade.typeSourceSpan,
    type: wrapReference(facade.type),
    internalType: new WrappedNodeExpr(facade.type),
    deps: convertR3DependencyMetadataArray(facade.deps),
    host: extractHostBindings(facade.propMetadata, facade.typeSourceSpan, facade.host),
    inputs: {...inputsFromMetadata, ...inputsFromType},
    outputs: {...outputsFromMetadata, ...outputsFromType},
    queries: facade.queries.map(convertToR3QueryMetadata),
    providers: facade.providers != null ? new WrappedNodeExpr(facade.providers) : null,
    viewQueries: facade.viewQueries.map(convertToR3QueryMetadata),
    fullInheritance: false,
  };
}

// This seems to be needed to placate TS v3.0 only
type R3DirectiveMetadataFacadeNoPropAndWhitespace =
    Pick<R3DirectiveMetadataFacade, Exclude<keyof R3DirectiveMetadataFacade, 'propMetadata'>>;


function convertR3DependencyMetadata(facade: R3DependencyMetadataFacade): R3DependencyMetadata {
  let tokenExpr;
  if (facade.token === null) {
    tokenExpr = new LiteralExpr(null);
  } else if (facade.resolved === R3ResolvedDependencyType.Attribute) {
    tokenExpr = new LiteralExpr(facade.token);
  } else {
    tokenExpr = new WrappedNodeExpr(facade.token);
  }
  return {
    token: tokenExpr,
    attribute: null,
    resolved: facade.resolved,
    host: facade.host,
    optional: facade.optional,
    self: facade.self,
    skipSelf: facade.skipSelf,
  };
}

function convertR3DependencyMetadataArray(facades: R3DependencyMetadataFacade[] | null | undefined):
    R3DependencyMetadata[]|null {
  return facades == null ? null : facades.map(convertR3DependencyMetadata);
}

function extractHostBindings(
    propMetadata: {[key: string]: any[]}, sourceSpan: ParseSourceSpan,
    host?: {[key: string]: string}): ParsedHostBindings {
  // First parse the declarations from the metadata.
  const bindings = parseHostBindings(host || {});

  // After that check host bindings for errors
  const errors = verifyHostBindings(bindings, sourceSpan);
  if (errors.length) {
    throw new Error(errors.map((error: ParseError) => error.msg).join('\n'));
  }

  // Next, loop over the properties of the object, looking for @HostBinding and @HostListener.
  for (const field in propMetadata) {
    if (propMetadata.hasOwnProperty(field)) {
      propMetadata[field].forEach(ann => {
        if (isHostBinding(ann)) {
          bindings.properties[ann.hostPropertyName || field] = field;
        } else if (isHostListener(ann)) {
          bindings.listeners[ann.eventName || field] = `${field}(${(ann.args || []).join(',')})`;
        }
      });
    }
  }

  return bindings;
}

function isHostBinding(value: any): value is HostBinding {
  return value.ngMetadataName === 'HostBinding';
}

function isHostListener(value: any): value is HostListener {
  return value.ngMetadataName === 'HostListener';
}


function isInput(value: any): value is Input {
  return value.ngMetadataName === 'Input';
}

function isOutput(value: any): value is Output {
  return value.ngMetadataName === 'Output';
}

function parseInputOutputs(values: string[]): StringMap {
  return values.reduce(
      (map, value) => {
        const [field, property] = value.split(',').map(piece => piece.trim());
        map[field] = property || field;
        return map;
      },
      {} as StringMap);
}

export function publishFacade(global: any) {
  const ng: ExportedCompilerFacade = global.ng || (global.ng = {});
  ng.ɵcompilerFacade = new CompilerFacadeImpl();
}
