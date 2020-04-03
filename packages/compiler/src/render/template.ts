/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {flatten, sanitizeIdentifier} from '../../compile_metadata';
import {BindingForm, BuiltinFunctionCall, LocalResolver, convertActionBinding, convertPropertyBinding, convertUpdateArguments} from '../../compiler_util/expression_converter';
import {ConstantPool} from '../../constant_pool';
import * as core from '../../core';
import {AST, AstMemoryEfficientTransformer, BindingPipe, BindingType, FunctionCall, ImplicitReceiver, Interpolation, LiteralArray, LiteralMap, LiteralPrimitive, ParsedEventType, PropertyRead} from '../../expression_parser/ast';
import {Lexer} from '../../expression_parser/lexer';
import {IvyParser} from '../../expression_parser/parser';
import * as i18n from '../../i18n/i18n_ast';
import * as html from '../../ml_parser/ast';
import {HtmlParser} from '../../ml_parser/html_parser';
import {WhitespaceVisitor} from '../../ml_parser/html_whitespaces';
import {DEFAULT_INTERPOLATION_CONFIG, InterpolationConfig} from '../../ml_parser/interpolation_config';
import {LexerRange} from '../../ml_parser/lexer';
import {isNgContainer as checkIsNgContainer, splitNsName} from '../../ml_parser/tags';
import {mapLiteral} from '../../output/map_util';
import * as o from '../../output/output_ast';
import {ParseError, ParseSourceSpan} from '../../parse_util';
import {DomElementSchemaRegistry} from '../../schema/dom_element_schema_registry';
import {CssSelector, SelectorMatcher} from '../../selector';
import {BindingParser} from '../../template_parser/binding_parser';
import {error} from '../../util';
import * as t from '../r3_ast';
import {Identifiers as R3} from '../r3_identifiers';
import {htmlAstToRender3Ast} from '../r3_template_transform';
import {prepareSyntheticListenerFunctionName, prepareSyntheticListenerName, prepareSyntheticPropertyName} from '../util';

import {I18nContext} from './i18n/context';
import {createGoogleGetMsgStatements} from './i18n/get_msg_utils';
import {createLocalizeStatements} from './i18n/localize_utils';
import {I18nMetaVisitor} from './i18n/meta';
import {I18N_ICU_MAPPING_PREFIX, TRANSLATION_PREFIX, assembleBoundTextPlaceholders, assembleI18nBoundString, declareI18nVariable, getTranslationConstPrefix, i18nFormatPlaceholderNames, icuFromI18nMessage, isI18nRootNode, isSingleI18nIcu, placeholdersToParams, wrapI18nPlaceholder} from './i18n/util';
import {StylingBuilder, StylingInstruction} from './styling_builder';
import {CONTEXT_NAME, IMPLICIT_REFERENCE, NON_BINDABLE_ATTR, REFERENCE_PREFIX, RENDER_FLAGS, asLiteral, chainedInstruction, getAttrsForDirectiveMatching, getInterpolationArgsLength, invalid, trimTrailingNulls, unsupported} from './util';



// Selector attribute name of `<ng-content>`
const NG_CONTENT_SELECT_ATTR = 'select';

// Attribute name of `ngProjectAs`.
const NG_PROJECT_AS_ATTR_NAME = 'ngProjectAs';

// List of supported global targets for event listeners
const GLOBAL_TARGET_RESOLVERS = new Map<string, o.ExternalReference>(
    [['window', R3.resolveWindow], ['document', R3.resolveDocument], ['body', R3.resolveBody]]);

const LEADING_TRIVIA_CHARS = [' ', '\n', '\r', '\t'];

//  if (rf & flags) { .. }
export function renderFlagCheckIfStmt(
    flags: core.RenderFlags, statements: o.Statement[]): o.IfStmt {
  return o.ifStmt(o.variable(RENDER_FLAGS).bitwiseAnd(o.literal(flags), null, false), statements);
}

export function prepareEventListenerParameters(
    eventAst: t.BoundEvent, handlerName: string | null = null,
    scope: BindingScope | null = null): o.Expression[] {
  const {type, name, target, phase, handler} = eventAst;
  if (target && !GLOBAL_TARGET_RESOLVERS.has(target)) {
    throw new Error(`Unexpected global target '${target}' defined for '${name}' event.
        Supported list of global targets: ${Array.from(GLOBAL_TARGET_RESOLVERS.keys())}.`);
  }

  const eventArgumentName = '$event';
  const implicitReceiverAccesses = new Set<string>();
  const implicitReceiverExpr = (scope === null || scope.bindingLevel === 0) ?
      o.variable(CONTEXT_NAME) :
      scope.getOrCreateSharedContextVar(0);
  const bindingExpr = convertActionBinding(
      scope, implicitReceiverExpr, handler, 'b', () => error('Unexpected interpolation'),
      eventAst.handlerSpan, implicitReceiverAccesses);
  const statements = [];
  if (scope) {
    statements.push(...scope.restoreViewStatement());
    statements.push(...scope.variableDeclarations());
  }
  statements.push(...bindingExpr.render3Stmts);

  const eventName: string =
      type === ParsedEventType.Animation ? prepareSyntheticListenerName(name, phase !) : name;
  const fnName = handlerName && sanitizeIdentifier(handlerName);
  const fnArgs: o.FnParam[] = [];

  if (implicitReceiverAccesses.has(eventArgumentName)) {
    fnArgs.push(new o.FnParam(eventArgumentName, o.DYNAMIC_TYPE));
  }

  const handlerFn = o.fn(fnArgs, statements, o.INFERRED_TYPE, null, fnName);
  const params: o.Expression[] = [o.literal(eventName), handlerFn];
  if (target) {
    params.push(
        o.literal(false),  // `useCapture` flag, defaults to `false`
        o.importExpr(GLOBAL_TARGET_RESOLVERS.get(target) !));
  }
  return params;
}

export class TemplateDefinitionBuilder implements t.Visitor<void>, LocalResolver {
  private _dataIndex = 0;
  private _bindingContext = 0;
  private _prefixCode: o.Statement[] = [];
  /**
   * List of callbacks to generate creation mode instructions. We store them here as we process
   * the template so bindings in listeners are resolved only once all nodes have been visited.
   * This ensures all local refs and context variables are available for matching.
   */
  private _creationCodeFns: (() => o.Statement)[] = [];
  /**
   * List of callbacks to generate update mode instructions. We store them here as we process
   * the template so bindings are resolved only once all nodes have been visited. This ensures
   * all local refs and context variables are available for matching.
   */
  private _updateCodeFns: (() => o.Statement)[] = [];

  /** Index of the currently-selected node. */
  private _currentIndex: number = 0;

  /** Temporary variable declarations generated from visiting pipes, literals, etc. */
  private _tempVariables: o.Statement[] = [];
  /**
   * List of callbacks to build nested templates. Nested templates must not be visited until
   * after the parent template has finished visiting all of its nodes. This ensures that all
   * local ref bindings in nested templates are able to find local ref values if the refs
   * are defined after the template declaration.
   */
  private _nestedTemplateFns: (() => void)[] = [];
  /**
   * This scope contains local variables declared in the update mode block of the template.
   * (e.g. refs and context vars in bindings)
   */
  private _bindingScope: BindingScope;
  private _valueConverter: ValueConverter;
  private _unsupported = unsupported;

  // i18n context local to this template
  private i18n: I18nContext|null = null;

  // Number of slots to reserve for pureFunctions
  private _pureFunctionSlots = 0;

  // Number of binding slots
  private _bindingSlots = 0;

  private fileBasedI18nSuffix: string;

  // Projection slots found in the template. Projection slots can distribute projected
  // nodes based on a selector, or can just use the wildcard selector to match
  // all nodes which aren't matching any selector.
  private _ngContentReservedSlots: (string|'*')[] = [];

  // Number of non-default selectors found in all parent templates of this template. We need to
  // track it to properly adjust projection slot index in the `projection` instruction.
  private _ngContentSelectorsOffset = 0;

  // Expression that should be used as implicit receiver when converting template
  // expressions to output AST.
  private _implicitReceiverExpr: o.ReadVarExpr|null = null;

  constructor(
      private constantPool: ConstantPool, parentBindingScope: BindingScope, private level = 0,
      private contextName: string|null, private i18nContext: I18nContext|null,
      private templateIndex: number|null, private templateName: string|null,
      private directiveMatcher: SelectorMatcher|null, private directives: Set<o.Expression>,
      private pipeTypeByName: Map<string, o.Expression>, private pipes: Set<o.Expression>,
      private _namespace: o.ExternalReference, relativeContextFilePath: string,
      private i18nUseExternalIds: boolean, private _constants: o.Expression[] = []) {
    this._bindingScope = parentBindingScope.nestedScope(level);

    // Turn the relative context file path into an identifier by replacing non-alphanumeric
    // characters with underscores.
    this.fileBasedI18nSuffix = relativeContextFilePath.replace(/[^A-Za-z0-9]/g, '_') + '_';

    this._valueConverter = new ValueConverter(
        constantPool, () => this.allocateDataSlot(),
        (numSlots: number) => this.allocatePureFunctionSlots(numSlots),
        (name, localName, slot, value: o.Expression) => {
          const pipeType = pipeTypeByName.get(name);
          if (pipeType) {
            this.pipes.add(pipeType);
          }
          this._bindingScope.set(this.level, localName, value);
          this.creationInstruction(null, R3.pipe, [o.literal(slot), o.literal(name)]);
        });
  }

  buildTemplateFunction(
      nodes: t.Node[], variables: t.Variable[], ngContentSelectorsOffset: number = 0,
      i18n?: i18n.I18nMeta): o.FunctionExpr {
    this._ngContentSelectorsOffset = ngContentSelectorsOffset;

    if (this._namespace !== R3.namespaceHTML) {
      this.creationInstruction(null, this._namespace);
    }

    // Create variable bindings
    variables.forEach(v => this.registerContextVariables(v));

    // Initiate i18n context in case:
    // - this template has parent i18n context
    // - or the template has i18n meta associated with it,
    //   but it's not initiated by the Element (e.g. <ng-template i18n>)
    const initI18nContext =
        this.i18nContext || (isI18nRootNode(i18n) && !isSingleI18nIcu(i18n) &&
                             !(isSingleElementTemplate(nodes) && nodes[0].i18n === i18n));
    const selfClosingI18nInstruction = hasTextChildrenOnly(nodes);
    if (initI18nContext) {
      this.i18nStart(null, i18n !, selfClosingI18nInstruction);
    }

    // This is the initial pass through the nodes of this template. In this pass, we
    // queue all creation mode and update mode instructions for generation in the second
    // pass. It's necessary to separate the passes to ensure local refs are defined before
    // resolving bindings. We also count bindings in this pass as we walk bound expressions.
    t.visitAll(this, nodes);

    // Add total binding count to pure function count so pure function instructions are
    // generated with the correct slot offset when update instructions are processed.
    this._pureFunctionSlots += this._bindingSlots;

    // Pipes are walked in the first pass (to enqueue `pipe()` creation instructions and
    // `pipeBind` update instructions), so we have to update the slot offsets manually
    // to account for bindings.
    this._valueConverter.updatePipeSlotOffsets(this._bindingSlots);

    // Nested templates must be processed before creation instructions so template()
    // instructions can be generated with the correct internal const count.
    this._nestedTemplateFns.forEach(buildTemplateFn => buildTemplateFn());

    // Output the `projectionDef` instruction when some `<ng-content>` tags are present.
    // The `projectionDef` instruction is only emitted for the component template and
    // is skipped for nested templates (<ng-template> tags).
    if (this.level === 0 && this._ngContentReservedSlots.length) {
      const parameters: o.Expression[] = [];

      // By default the `projectionDef` instructions creates one slot for the wildcard
      // selector if no parameters are passed. Therefore we only want to allocate a new
      // array for the projection slots if the default projection slot is not sufficient.
      if (this._ngContentReservedSlots.length > 1 || this._ngContentReservedSlots[0] !== '*') {
        const r3ReservedSlots = this._ngContentReservedSlots.map(
            s => s !== '*' ? core.parseSelectorToR3Selector(s) : s);
        parameters.push(this.constantPool.getConstLiteral(asLiteral(r3ReservedSlots), true));
      }

      // Since we accumulate ngContent selectors while processing template elements,
      // we *prepend* `projectionDef` to creation instructions block, to put it before
      // any `projection` instructions
      this.creationInstruction(null, R3.projectionDef, parameters, /* prepend */ true);
    }

    if (initI18nContext) {
      this.i18nEnd(null, selfClosingI18nInstruction);
    }

    // Generate all the creation mode instructions (e.g. resolve bindings in listeners)
    const creationStatements = this._creationCodeFns.map((fn: () => o.Statement) => fn());

    // Generate all the update mode instructions (e.g. resolve property or text bindings)
    const updateStatements = this._updateCodeFns.map((fn: () => o.Statement) => fn());

    //  Variable declaration must occur after binding resolution so we can generate context
    //  instructions that build on each other.
    // e.g. const b = nextContext().$implicit(); const b = nextContext();
    const creationVariables = this._bindingScope.viewSnapshotStatements();
    const updateVariables = this._bindingScope.variableDeclarations().concat(this._tempVariables);

    const creationBlock = creationStatements.length > 0 ?
        [renderFlagCheckIfStmt(
            core.RenderFlags.Create, creationVariables.concat(creationStatements))] :
        [];

    const updateBlock = updateStatements.length > 0 ?
        [renderFlagCheckIfStmt(core.RenderFlags.Update, updateVariables.concat(updateStatements))] :
        [];

    return o.fn(
        // i.e. (rf: RenderFlags, ctx: any)
        [new o.FnParam(RENDER_FLAGS, o.NUMBER_TYPE), new o.FnParam(CONTEXT_NAME, null)],
        [
          // Temporary variable declarations for query refresh (i.e. let _t: any;)
          ...this._prefixCode,
          // Creating mode (i.e. if (rf & RenderFlags.Create) { ... })
          ...creationBlock,
          // Binding and refresh mode (i.e. if (rf & RenderFlags.Update) {...})
          ...updateBlock,
        ],
        o.INFERRED_TYPE, null, this.templateName);
  }

  // LocalResolver
  getLocal(name: string): o.Expression|null { return this._bindingScope.get(name); }

  // LocalResolver
  notifyImplicitReceiverUse(): void { this._bindingScope.notifyImplicitReceiverUse(); }

  private i18nTranslate(
      message: i18n.Message, params: {[name: string]: o.Expression} = {}, ref?: o.ReadVarExpr,
      transformFn?: (raw: o.ReadVarExpr) => o.Expression): o.ReadVarExpr {
    const _ref = ref || o.variable(this.constantPool.uniqueName(TRANSLATION_PREFIX));
    // Closure Compiler requires const names to start with `MSG_` but disallows any other const to
    // start with `MSG_`. We define a variable starting with `MSG_` just for the `goog.getMsg` call
    const closureVar = this.i18nGenerateClosureVar(message.id);
    const statements = getTranslationDeclStmts(message, _ref, closureVar, params, transformFn);
    this.constantPool.statements.push(...statements);
    return _ref;
  }

  private registerContextVariables(variable: t.Variable) {
    const scopedName = this._bindingScope.freshReferenceName();
    const retrievalLevel = this.level;
    const lhs = o.variable(variable.name + scopedName);
    this._bindingScope.set(
        retrievalLevel, variable.name, lhs, DeclarationPriority.CONTEXT,
        (scope: BindingScope, relativeLevel: number) => {
          let rhs: o.Expression;
          if (scope.bindingLevel === retrievalLevel) {
            // e.g. ctx
            rhs = o.variable(CONTEXT_NAME);
          } else {
            const sharedCtxVar = scope.getSharedContextName(retrievalLevel);
            // e.g. ctx_r0   OR  x(2);
            rhs = sharedCtxVar ? sharedCtxVar : generateNextContextExpr(relativeLevel);
          }
          // e.g. const $item$ = x(2).$implicit;
          return [lhs.set(rhs.prop(variable.value || IMPLICIT_REFERENCE)).toConstDecl()];
        });
  }

  private i18nAppendBindings(expressions: AST[]) {
    if (expressions.length > 0) {
      expressions.forEach(expression => this.i18n !.appendBinding(expression));
    }
  }

  private i18nBindProps(props: {[key: string]: t.Text | t.BoundText}):
      {[key: string]: o.Expression} {
    const bound: {[key: string]: o.Expression} = {};
    Object.keys(props).forEach(key => {
      const prop = props[key];
      if (prop instanceof t.Text) {
        bound[key] = o.literal(prop.value);
      } else {
        const value = prop.value.visit(this._valueConverter);
        this.allocateBindingSlots(value);
        if (value instanceof Interpolation) {
          const {strings, expressions} = value;
          const {id, bindings} = this.i18n !;
          const label = assembleI18nBoundString(strings, bindings.size, id);
          this.i18nAppendBindings(expressions);
          bound[key] = o.literal(label);
        }
      }
    });
    return bound;
  }

  private i18nGenerateClosureVar(messageId: string): o.ReadVarExpr {
    let name: string;
    const suffix = this.fileBasedI18nSuffix.toUpperCase();
    if (this.i18nUseExternalIds) {
      const prefix = getTranslationConstPrefix(`EXTERNAL_`);
      const uniqueSuffix = this.constantPool.uniqueName(suffix);
      name = `${prefix}${sanitizeIdentifier(messageId)}$$${uniqueSuffix}`;
    } else {
      const prefix = getTranslationConstPrefix(suffix);
      name = this.constantPool.uniqueName(prefix);
    }
    return o.variable(name);
  }

  private i18nUpdateRef(context: I18nContext): void {
    const {icus, meta, isRoot, isResolved, isEmitted} = context;
    if (isRoot && isResolved && !isEmitted && !isSingleI18nIcu(meta)) {
      context.isEmitted = true;
      const placeholders = context.getSerializedPlaceholders();
      let icuMapping: {[name: string]: o.Expression} = {};
      let params: {[name: string]: o.Expression} =
          placeholders.size ? placeholdersToParams(placeholders) : {};
      if (icus.size) {
        icus.forEach((refs: o.Expression[], key: string) => {
          if (refs.length === 1) {
            // if we have one ICU defined for a given
            // placeholder - just output its reference
            params[key] = refs[0];
          } else {
            // ... otherwise we need to activate post-processing
            // to replace ICU placeholders with proper values
            const placeholder: string = wrapI18nPlaceholder(`${I18N_ICU_MAPPING_PREFIX}${key}`);
            params[key] = o.literal(placeholder);
            icuMapping[key] = o.literalArr(refs);
          }
        });
      }

      // translation requires post processing in 2 cases:
      // - if we have placeholders with multiple values (ex. `START_DIV`: [�#1�, �#2�, ...])
      // - if we have multiple ICUs that refer to the same placeholder name
      const needsPostprocessing =
          Array.from(placeholders.values()).some((value: string[]) => value.length > 1) ||
          Object.keys(icuMapping).length;

      let transformFn;
      if (needsPostprocessing) {
        transformFn = (raw: o.ReadVarExpr) => {
          const args: o.Expression[] = [raw];
          if (Object.keys(icuMapping).length) {
            args.push(mapLiteral(icuMapping, true));
          }
          return instruction(null, R3.i18nPostprocess, args);
        };
      }
      this.i18nTranslate(meta as i18n.Message, params, context.ref, transformFn);
    }
  }

  private i18nStart(span: ParseSourceSpan|null = null, meta: i18n.I18nMeta, selfClosing?: boolean):
      void {
    const index = this.allocateDataSlot();
    if (this.i18nContext) {
      this.i18n = this.i18nContext.forkChildContext(index, this.templateIndex !, meta);
    } else {
      const ref = o.variable(this.constantPool.uniqueName(TRANSLATION_PREFIX));
      this.i18n = new I18nContext(index, ref, 0, this.templateIndex, meta);
    }

    // generate i18nStart instruction
    const {id, ref} = this.i18n;
    const params: o.Expression[] = [o.literal(index), ref];
    if (id > 0) {
      // do not push 3rd argument (sub-block id)
      // into i18nStart call for top level i18n context
      params.push(o.literal(id));
    }
    this.creationInstruction(span, selfClosing ? R3.i18n : R3.i18nStart, params);
  }

  private i18nEnd(span: ParseSourceSpan|null = null, selfClosing?: boolean): void {
    if (!this.i18n) {
      throw new Error('i18nEnd is executed with no i18n context present');
    }

    if (this.i18nContext) {
      this.i18nContext.reconcileChildContext(this.i18n);
      this.i18nUpdateRef(this.i18nContext);
    } else {
      this.i18nUpdateRef(this.i18n);
    }

    // setup accumulated bindings
    const {index, bindings} = this.i18n;
    if (bindings.size) {
      const chainBindings: ChainableBindingInstruction[] = [];
      bindings.forEach(binding => {
        chainBindings.push({sourceSpan: span, value: () => this.convertPropertyBinding(binding)});
      });
      // for i18n block, advance to the most recent element index (by taking the current number of
      // elements and subtracting one) before invoking `i18nExp` instructions, to make sure the
      // necessary lifecycle hooks of components/directives are properly flushed.
      this.updateInstructionChainWithAdvance(this.getConstCount() - 1, R3.i18nExp, chainBindings);
      this.updateInstruction(span, R3.i18nApply, [o.literal(index)]);
    }
    if (!selfClosing) {
      this.creationInstruction(span, R3.i18nEnd);
    }
    this.i18n = null;  // reset local i18n context
  }

  private i18nAttributesInstruction(
      nodeIndex: number, attrs: (t.TextAttribute|t.BoundAttribute)[],
      sourceSpan: ParseSourceSpan): void {
    let hasBindings: boolean = false;
    const i18nAttrArgs: o.Expression[] = [];
    const bindings: ChainableBindingInstruction[] = [];
    attrs.forEach(attr => {
      const message = attr.i18n !as i18n.Message;
      if (attr instanceof t.TextAttribute) {
        i18nAttrArgs.push(o.literal(attr.name), this.i18nTranslate(message));
      } else {
        const converted = attr.value.visit(this._valueConverter);
        this.allocateBindingSlots(converted);
        if (converted instanceof Interpolation) {
          const placeholders = assembleBoundTextPlaceholders(message);
          const params = placeholdersToParams(placeholders);
          i18nAttrArgs.push(o.literal(attr.name), this.i18nTranslate(message, params));
          converted.expressions.forEach(expression => {
            hasBindings = true;
            bindings.push({
              sourceSpan,
              value: () => this.convertPropertyBinding(expression),
            });
          });
        }
      }
    });
    if (bindings.length > 0) {
      this.updateInstructionChainWithAdvance(nodeIndex, R3.i18nExp, bindings);
    }
    if (i18nAttrArgs.length > 0) {
      const index: o.Expression = o.literal(this.allocateDataSlot());
      const args = this.constantPool.getConstLiteral(o.literalArr(i18nAttrArgs), true);
      this.creationInstruction(sourceSpan, R3.i18nAttributes, [index, args]);
      if (hasBindings) {
        this.updateInstruction(sourceSpan, R3.i18nApply, [index]);
      }
    }
  }

  private getNamespaceInstruction(namespaceKey: string|null) {
    switch (namespaceKey) {
      case 'math':
        return R3.namespaceMathML;
      case 'svg':
        return R3.namespaceSVG;
      default:
        return R3.namespaceHTML;
    }
  }

  private addNamespaceInstruction(nsInstruction: o.ExternalReference, element: t.Element) {
    this._namespace = nsInstruction;
    this.creationInstruction(element.sourceSpan, nsInstruction);
  }

  /**
   * Adds an update instruction for an interpolated property or attribute, such as
   * `prop="{{value}}"` or `attr.title="{{value}}"`
   */
  private interpolatedUpdateInstruction(
      instruction: o.ExternalReference, elementIndex: number, attrName: string,
      input: t.BoundAttribute, value: any, params: any[]) {
    this.updateInstructionWithAdvance(
        elementIndex, input.sourceSpan, instruction,
        () => [o.literal(attrName), ...this.getUpdateInstructionArguments(value), ...params]);
  }

  visitContent(ngContent: t.Content) {
    const slot = this.allocateDataSlot();
    const projectionSlotIdx = this._ngContentSelectorsOffset + this._ngContentReservedSlots.length;
    const parameters: o.Expression[] = [o.literal(slot)];

    this._ngContentReservedSlots.push(ngContent.selector);

    const nonContentSelectAttributes =
        ngContent.attributes.filter(attr => attr.name.toLowerCase() !== NG_CONTENT_SELECT_ATTR);
    const attributes = this.getAttributeExpressions(nonContentSelectAttributes, [], []);

    if (attributes.length > 0) {
      parameters.push(o.literal(projectionSlotIdx), o.literalArr(attributes));
    } else if (projectionSlotIdx !== 0) {
      parameters.push(o.literal(projectionSlotIdx));
    }

    this.creationInstruction(ngContent.sourceSpan, R3.projection, parameters);
    if (this.i18n) {
      this.i18n.appendProjection(ngContent.i18n !, slot);
    }
  }

  visitElement(element: t.Element) {
    const elementIndex = this.allocateDataSlot();
    const stylingBuilder = new StylingBuilder(null);

    let isNonBindableMode: boolean = false;
    const isI18nRootElement: boolean =
        isI18nRootNode(element.i18n) && !isSingleI18nIcu(element.i18n);

    const i18nAttrs: (t.TextAttribute | t.BoundAttribute)[] = [];
    const outputAttrs: t.TextAttribute[] = [];

    const [namespaceKey, elementName] = splitNsName(element.name);
    const isNgContainer = checkIsNgContainer(element.name);

    // Handle styling, i18n, ngNonBindable attributes
    for (const attr of element.attributes) {
      const {name, value} = attr;
      if (name === NON_BINDABLE_ATTR) {
        isNonBindableMode = true;
      } else if (name === 'style') {
        stylingBuilder.registerStyleAttr(value);
      } else if (name === 'class') {
        stylingBuilder.registerClassAttr(value);
      } else {
        (attr.i18n ? i18nAttrs : outputAttrs).push(attr);
      }
    }

    // Match directives on non i18n attributes
    this.matchDirectives(element.name, element);

    // Regular element or ng-container creation mode
    const parameters: o.Expression[] = [o.literal(elementIndex)];
    if (!isNgContainer) {
      parameters.push(o.literal(elementName));
    }

    // Add the attributes
    const allOtherInputs: t.BoundAttribute[] = [];

    element.inputs.forEach((input: t.BoundAttribute) => {
      const stylingInputWasSet = stylingBuilder.registerBoundInput(input);
      if (!stylingInputWasSet) {
        if (input.type === BindingType.Property && input.i18n) {
          i18nAttrs.push(input);
        } else {
          allOtherInputs.push(input);
        }
      }
    });

    // add attributes for directive and projection matching purposes
    const attributes: o.Expression[] = this.getAttributeExpressions(
        outputAttrs, allOtherInputs, element.outputs, stylingBuilder, [], i18nAttrs);
    parameters.push(this.addAttrsToConsts(attributes));

    // local refs (ex.: <div #foo #bar="baz">)
    const refs = this.prepareRefsArray(element.references);
    parameters.push(this.addToConsts(refs));

    const wasInNamespace = this._namespace;
    const currentNamespace = this.getNamespaceInstruction(namespaceKey);

    // If the namespace is changing now, include an instruction to change it
    // during element creation.
    if (currentNamespace !== wasInNamespace) {
      this.addNamespaceInstruction(currentNamespace, element);
    }

    if (this.i18n) {
      this.i18n.appendElement(element.i18n !, elementIndex);
    }

    // Note that we do not append text node instructions and ICUs inside i18n section,
    // so we exclude them while calculating whether current element has children
    const hasChildren = (!isI18nRootElement && this.i18n) ? !hasTextChildrenOnly(element.children) :
                                                            element.children.length > 0;

    const createSelfClosingInstruction = !stylingBuilder.hasBindingsWithPipes &&
        element.outputs.length === 0 && i18nAttrs.length === 0 && !hasChildren;
    const createSelfClosingI18nInstruction =
        !createSelfClosingInstruction && hasTextChildrenOnly(element.children);

    if (createSelfClosingInstruction) {
      this.creationInstruction(
          element.sourceSpan, isNgContainer ? R3.elementContainer : R3.element,
          trimTrailingNulls(parameters));
    } else {
      this.creationInstruction(
          element.sourceSpan, isNgContainer ? R3.elementContainerStart : R3.elementStart,
          trimTrailingNulls(parameters));

      if (isNonBindableMode) {
        this.creationInstruction(element.sourceSpan, R3.disableBindings);
      }

      if (i18nAttrs.length > 0) {
        this.i18nAttributesInstruction(elementIndex, i18nAttrs, element.sourceSpan);
      }

      // Generate Listeners (outputs)
      if (element.outputs.length > 0) {
        const listeners = element.outputs.map(
            (outputAst: t.BoundEvent) => ({
              sourceSpan: outputAst.sourceSpan,
              params: this.prepareListenerParameter(element.name, outputAst, elementIndex)
            }));
        this.creationInstructionChain(R3.listener, listeners);
      }

      // Note: it's important to keep i18n/i18nStart instructions after i18nAttributes and
      // listeners, to make sure i18nAttributes instruction targets current element at runtime.
      if (isI18nRootElement) {
        this.i18nStart(element.sourceSpan, element.i18n !, createSelfClosingI18nInstruction);
      }
    }

    // the code here will collect all update-level styling instructions and add them to the
    // update block of the template function AOT code. Instructions like `styleProp`,
    // `styleMap`, `classMap`, `classProp`
    // are all generated and assigned in the code below.
    const stylingInstructions = stylingBuilder.buildUpdateLevelInstructions(this._valueConverter);
    const limit = stylingInstructions.length - 1;
    for (let i = 0; i <= limit; i++) {
      const instruction = stylingInstructions[i];
      this._bindingSlots += this.processStylingUpdateInstruction(elementIndex, instruction);
    }

    // the reason why `undefined` is used is because the renderer understands this as a
    // special value to symbolize that there is no RHS to this binding
    // TODO (matsko): revisit this once FW-959 is approached
    const emptyValueBindInstruction = o.literal(undefined);
    const propertyBindings: ChainableBindingInstruction[] = [];
    const attributeBindings: ChainableBindingInstruction[] = [];

    // Generate element input bindings
    allOtherInputs.forEach((input: t.BoundAttribute) => {
      const inputType = input.type;
      if (inputType === BindingType.Animation) {
        const value = input.value.visit(this._valueConverter);
        // animation bindings can be presented in the following formats:
        // 1. [@binding]="fooExp"
        // 2. [@binding]="{value:fooExp, params:{...}}"
        // 3. [@binding]
        // 4. @binding
        // All formats will be valid for when a synthetic binding is created.
        // The reasoning for this is because the renderer should get each
        // synthetic binding value in the order of the array that they are
        // defined in...
        const hasValue = value instanceof LiteralPrimitive ? !!value.value : true;
        this.allocateBindingSlots(value);

        propertyBindings.push({
          name: prepareSyntheticPropertyName(input.name),
          sourceSpan: input.sourceSpan,
          value: () => hasValue ? this.convertPropertyBinding(value) : emptyValueBindInstruction
        });
      } else {
        // we must skip attributes with associated i18n context, since these attributes are handled
        // separately and corresponding `i18nExp` and `i18nApply` instructions will be generated
        if (input.i18n) return;

        const value = input.value.visit(this._valueConverter);
        if (value !== undefined) {
          const params: any[] = [];
          const [attrNamespace, attrName] = splitNsName(input.name);
          const isAttributeBinding = inputType === BindingType.Attribute;
          const sanitizationRef = resolveSanitizationFn(input.securityContext, isAttributeBinding);
          if (sanitizationRef) params.push(sanitizationRef);
          if (attrNamespace) {
            const namespaceLiteral = o.literal(attrNamespace);

            if (sanitizationRef) {
              params.push(namespaceLiteral);
            } else {
              // If there wasn't a sanitization ref, we need to add
              // an extra param so that we can pass in the namespace.
              params.push(o.literal(null), namespaceLiteral);
            }
          }
          this.allocateBindingSlots(value);

          if (inputType === BindingType.Property) {
            if (value instanceof Interpolation) {
              // prop="{{value}}" and friends
              this.interpolatedUpdateInstruction(
                  getPropertyInterpolationExpression(value), elementIndex, attrName, input, value,
                  params);
            } else {
              // [prop]="value"
              // Collect all the properties so that we can chain into a single function at the end.
              propertyBindings.push({
                name: attrName,
                sourceSpan: input.sourceSpan,
                value: () => this.convertPropertyBinding(value), params
              });
            }
          } else if (inputType === BindingType.Attribute) {
            if (value instanceof Interpolation && getInterpolationArgsLength(value) > 1) {
              // attr.name="text{{value}}" and friends
              this.interpolatedUpdateInstruction(
                  getAttributeInterpolationExpression(value), elementIndex, attrName, input, value,
                  params);
            } else {
              const boundValue = value instanceof Interpolation ? value.expressions[0] : value;
              // [attr.name]="value" or attr.name="{{value}}"
              // Collect the attribute bindings so that they can be chained at the end.
              attributeBindings.push({
                name: attrName,
                sourceSpan: input.sourceSpan,
                value: () => this.convertPropertyBinding(boundValue), params
              });
            }
          } else {
            // class prop
            this.updateInstructionWithAdvance(elementIndex, input.sourceSpan, R3.classProp, () => {
              return [
                o.literal(elementIndex), o.literal(attrName), this.convertPropertyBinding(value),
                ...params
              ];
            });
          }
        }
      }
    });

    if (propertyBindings.length > 0) {
      this.updateInstructionChainWithAdvance(elementIndex, R3.property, propertyBindings);
    }

    if (attributeBindings.length > 0) {
      this.updateInstructionChainWithAdvance(elementIndex, R3.attribute, attributeBindings);
    }

    // Traverse element child nodes
    t.visitAll(this, element.children);

    if (!isI18nRootElement && this.i18n) {
      this.i18n.appendElement(element.i18n !, elementIndex, true);
    }

    if (!createSelfClosingInstruction) {
      // Finish element construction mode.
      const span = element.endSourceSpan || element.sourceSpan;
      if (isI18nRootElement) {
        this.i18nEnd(span, createSelfClosingI18nInstruction);
      }
      if (isNonBindableMode) {
        this.creationInstruction(span, R3.enableBindings);
      }
      this.creationInstruction(span, isNgContainer ? R3.elementContainerEnd : R3.elementEnd);
    }
  }


  visitTemplate(template: t.Template) {
    const NG_TEMPLATE_TAG_NAME = 'ng-template';
    const templateIndex = this.allocateDataSlot();

    if (this.i18n) {
      this.i18n.appendTemplate(template.i18n !, templateIndex);
    }

    const tagName = sanitizeIdentifier(template.tagName || '');
    const contextName = `${this.contextName}${tagName ? '_' + tagName : ''}_${templateIndex}`;
    const templateName = `${contextName}_Template`;

    const parameters: o.Expression[] = [
      o.literal(templateIndex),
      o.variable(templateName),

      // We don't care about the tag's namespace here, because we infer
      // it based on the parent nodes inside the template instruction.
      o.literal(template.tagName ? splitNsName(template.tagName)[1] : template.tagName),
    ];

    // find directives matching on a given <ng-template> node
    this.matchDirectives(NG_TEMPLATE_TAG_NAME, template);

    // prepare attributes parameter (including attributes used for directive matching)
    // TODO (FW-1942): exclude i18n attributes from the main attribute list and pass them
    // as an `i18nAttrs` argument of the `getAttributeExpressions` function below.
    const attrsExprs: o.Expression[] = this.getAttributeExpressions(
        template.attributes, template.inputs, template.outputs, undefined, template.templateAttrs,
        undefined);
    parameters.push(this.addAttrsToConsts(attrsExprs));

    // local refs (ex.: <ng-template #foo>)
    if (template.references && template.references.length) {
      const refs = this.prepareRefsArray(template.references);
      parameters.push(this.addToConsts(refs));
      parameters.push(o.importExpr(R3.templateRefExtractor));
    }

    // Create the template function
    const templateVisitor = new TemplateDefinitionBuilder(
        this.constantPool, this._bindingScope, this.level + 1, contextName, this.i18n,
        templateIndex, templateName, this.directiveMatcher, this.directives, this.pipeTypeByName,
        this.pipes, this._namespace, this.fileBasedI18nSuffix, this.i18nUseExternalIds,
        this._constants);

    // Nested templates must not be visited until after their parent templates have completed
    // processing, so they are queued here until after the initial pass. Otherwise, we wouldn't
    // be able to support bindings in nested templates to local refs that occur after the
    // template definition. e.g. <div *ngIf="showing">{{ foo }}</div>  <div #foo></div>
    this._nestedTemplateFns.push(() => {
      const templateFunctionExpr = templateVisitor.buildTemplateFunction(
          template.children, template.variables,
          this._ngContentReservedSlots.length + this._ngContentSelectorsOffset, template.i18n);
      this.constantPool.statements.push(templateFunctionExpr.toDeclStmt(templateName, null));
      if (templateVisitor._ngContentReservedSlots.length) {
        this._ngContentReservedSlots.push(...templateVisitor._ngContentReservedSlots);
      }
    });

    // e.g. template(1, MyComp_Template_1)
    this.creationInstruction(template.sourceSpan, R3.templateCreate, () => {
      parameters.splice(
          2, 0, o.literal(templateVisitor.getConstCount()),
          o.literal(templateVisitor.getVarCount()));
      return trimTrailingNulls(parameters);
    });

    // handle property bindings e.g. ɵɵproperty('ngForOf', ctx.items), et al;
    this.templatePropertyBindings(templateIndex, template.templateAttrs);

    // Only add normal input/output binding instructions on explicit <ng-template> elements.
    if (template.tagName === NG_TEMPLATE_TAG_NAME) {
      const inputs: t.BoundAttribute[] = [];
      const i18nAttrs: (t.TextAttribute | t.BoundAttribute)[] =
          template.attributes.filter(attr => !!attr.i18n);

      template.inputs.forEach(
          (input: t.BoundAttribute) => (input.i18n ? i18nAttrs : inputs).push(input));

      // Add i18n attributes that may act as inputs to directives. If such attributes are present,
      // generate `i18nAttributes` instruction. Note: we generate it only for explicit <ng-template>
      // elements, in case of inline templates, corresponding instructions will be generated in the
      // nested template function.
      if (i18nAttrs.length > 0) {
        this.i18nAttributesInstruction(templateIndex, i18nAttrs, template.sourceSpan);
      }

      // Add the input bindings
      if (inputs.length > 0) {
        this.templatePropertyBindings(templateIndex, inputs);
      }

      // Generate listeners for directive output
      if (template.outputs.length > 0) {
        const listeners = template.outputs.map(
            (outputAst: t.BoundEvent) => ({
              sourceSpan: outputAst.sourceSpan,
              params: this.prepareListenerParameter('ng_template', outputAst, templateIndex)
            }));
        this.creationInstructionChain(R3.listener, listeners);
      }
    }
  }

  // These should be handled in the template or element directly.
  readonly visitReference = invalid;
  readonly visitVariable = invalid;
  readonly visitTextAttribute = invalid;
  readonly visitBoundAttribute = invalid;
  readonly visitBoundEvent = invalid;

  visitBoundText(text: t.BoundText) {
    if (this.i18n) {
      const value = text.value.visit(this._valueConverter);
      this.allocateBindingSlots(value);
      if (value instanceof Interpolation) {
        this.i18n.appendBoundText(text.i18n !);
        this.i18nAppendBindings(value.expressions);
      }
      return;
    }

    const nodeIndex = this.allocateDataSlot();

    this.creationInstruction(text.sourceSpan, R3.text, [o.literal(nodeIndex)]);

    const value = text.value.visit(this._valueConverter);
    this.allocateBindingSlots(value);

    if (value instanceof Interpolation) {
      this.updateInstructionWithAdvance(
          nodeIndex, text.sourceSpan, getTextInterpolationExpression(value),
          () => this.getUpdateInstructionArguments(value));
    } else {
      error('Text nodes should be interpolated and never bound directly.');
    }
  }

  visitText(text: t.Text) {
    // when a text element is located within a translatable
    // block, we exclude this text element from instructions set,
    // since it will be captured in i18n content and processed at runtime
    if (!this.i18n) {
      this.creationInstruction(
          text.sourceSpan, R3.text, [o.literal(this.allocateDataSlot()), o.literal(text.value)]);
    }
  }

  visitIcu(icu: t.Icu) {
    let initWasInvoked = false;

    // if an ICU was created outside of i18n block, we still treat
    // it as a translatable entity and invoke i18nStart and i18nEnd
    // to generate i18n context and the necessary instructions
    if (!this.i18n) {
      initWasInvoked = true;
      this.i18nStart(null, icu.i18n !, true);
    }

    const i18n = this.i18n !;
    const vars = this.i18nBindProps(icu.vars);
    const placeholders = this.i18nBindProps(icu.placeholders);

    // output ICU directly and keep ICU reference in context
    const message = icu.i18n !as i18n.Message;

    // we always need post-processing function for ICUs, to make sure that:
    // - all placeholders in a form of {PLACEHOLDER} are replaced with actual values (note:
    // `goog.getMsg` does not process ICUs and uses the `{PLACEHOLDER}` format for placeholders
    // inside ICUs)
    // - all ICU vars (such as `VAR_SELECT` or `VAR_PLURAL`) are replaced with correct values
    const transformFn = (raw: o.ReadVarExpr) => {
      const params = {...vars, ...placeholders};
      const formatted = i18nFormatPlaceholderNames(params, /* useCamelCase */ false);
      return instruction(null, R3.i18nPostprocess, [raw, mapLiteral(formatted, true)]);
    };

    // in case the whole i18n message is a single ICU - we do not need to
    // create a separate top-level translation, we can use the root ref instead
    // and make this ICU a top-level translation
    // note: ICU placeholders are replaced with actual values in `i18nPostprocess` function
    // separately, so we do not pass placeholders into `i18nTranslate` function.
    if (isSingleI18nIcu(i18n.meta)) {
      this.i18nTranslate(message, /* placeholders */ {}, i18n.ref, transformFn);
    } else {
      // output ICU directly and keep ICU reference in context
      const ref =
          this.i18nTranslate(message, /* placeholders */ {}, /* ref */ undefined, transformFn);
      i18n.appendIcu(icuFromI18nMessage(message).name, ref);
    }

    if (initWasInvoked) {
      this.i18nEnd(null, true);
    }
    return null;
  }

  private allocateDataSlot() { return this._dataIndex++; }

  getConstCount() { return this._dataIndex; }

  getVarCount() { return this._pureFunctionSlots; }

  getConsts() { return this._constants; }

  getNgContentSelectors(): o.Expression|null {
    return this._ngContentReservedSlots.length ?
        this.constantPool.getConstLiteral(asLiteral(this._ngContentReservedSlots), true) :
        null;
  }

  private bindingContext() { return `${this._bindingContext++}`; }

  private templatePropertyBindings(
      templateIndex: number, attrs: (t.BoundAttribute|t.TextAttribute)[]) {
    const propertyBindings: ChainableBindingInstruction[] = [];
    attrs.forEach(input => {
      if (input instanceof t.BoundAttribute) {
        const value = input.value.visit(this._valueConverter);

        if (value !== undefined) {
          this.allocateBindingSlots(value);
          if (value instanceof Interpolation) {
            // Params typically contain attribute namespace and value sanitizer, which is applicable
            // for regular HTML elements, but not applicable for <ng-template> (since props act as
            // inputs to directives), so keep params array empty.
            const params: any[] = [];

            // prop="{{value}}" case
            this.interpolatedUpdateInstruction(
                getPropertyInterpolationExpression(value), templateIndex, input.name, input, value,
                params);
          } else {
            // [prop]="value" case
            propertyBindings.push({
              name: input.name,
              sourceSpan: input.sourceSpan,
              value: () => this.convertPropertyBinding(value)
            });
          }
        }
      }
    });

    if (propertyBindings.length > 0) {
      this.updateInstructionChainWithAdvance(templateIndex, R3.property, propertyBindings);
    }
  }

  // Bindings must only be resolved after all local refs have been visited, so all
  // instructions are queued in callbacks that execute once the initial pass has completed.
  // Otherwise, we wouldn't be able to support local refs that are defined after their
  // bindings. e.g. {{ foo }} <div #foo></div>
  private instructionFn(
      fns: (() => o.Statement)[], span: ParseSourceSpan|null, reference: o.ExternalReference,
      paramsOrFn: o.Expression[]|(() => o.Expression[]), prepend: boolean = false): void {
    fns[prepend ? 'unshift' : 'push'](() => {
      const params = Array.isArray(paramsOrFn) ? paramsOrFn : paramsOrFn();
      return instruction(span, reference, params).toStmt();
    });
  }

  private processStylingUpdateInstruction(
      elementIndex: number, instruction: StylingInstruction|null) {
    let allocateBindingSlots = 0;
    if (instruction) {
      const calls: ChainableBindingInstruction[] = [];

      instruction.calls.forEach(call => {
        allocateBindingSlots += call.allocateBindingSlots;
        calls.push({
          sourceSpan: call.sourceSpan,
          value: () => {
            return call
                .params(
                    value => (call.supportsInterpolation && value instanceof Interpolation) ?
                        this.getUpdateInstructionArguments(value) :
                        this.convertPropertyBinding(value)) as o.Expression[];
          }
        });
      });

      this.updateInstructionChainWithAdvance(elementIndex, instruction.reference, calls);
    }

    return allocateBindingSlots;
  }

  private creationInstruction(
      span: ParseSourceSpan|null, reference: o.ExternalReference,
      paramsOrFn?: o.Expression[]|(() => o.Expression[]), prepend?: boolean) {
    this.instructionFn(this._creationCodeFns, span, reference, paramsOrFn || [], prepend);
  }

  private creationInstructionChain(reference: o.ExternalReference, calls: {
    sourceSpan: ParseSourceSpan | null,
    params: () => o.Expression[]
  }[]) {
    const span = calls.length ? calls[0].sourceSpan : null;
    this._creationCodeFns.push(() => {
      return chainedInstruction(reference, calls.map(call => call.params()), span).toStmt();
    });
  }

  private updateInstructionWithAdvance(
      nodeIndex: number, span: ParseSourceSpan|null, reference: o.ExternalReference,
      paramsOrFn?: o.Expression[]|(() => o.Expression[])) {
    this.addAdvanceInstructionIfNecessary(nodeIndex, span);
    this.updateInstruction(span, reference, paramsOrFn);
  }

  private updateInstruction(
      span: ParseSourceSpan|null, reference: o.ExternalReference,
      paramsOrFn?: o.Expression[]|(() => o.Expression[])) {
    this.instructionFn(this._updateCodeFns, span, reference, paramsOrFn || []);
  }

  private updateInstructionChain(
      reference: o.ExternalReference, bindings: ChainableBindingInstruction[]) {
    const span = bindings.length ? bindings[0].sourceSpan : null;

    this._updateCodeFns.push(() => {
      const calls = bindings.map(property => {
        const value = property.value();
        const fnParams = Array.isArray(value) ? value : [value];
        if (property.params) {
          fnParams.push(...property.params);
        }
        if (property.name) {
          // We want the property name to always be the first function parameter.
          fnParams.unshift(o.literal(property.name));
        }
        return fnParams;
      });

      return chainedInstruction(reference, calls, span).toStmt();
    });
  }

  private updateInstructionChainWithAdvance(
      nodeIndex: number, reference: o.ExternalReference, bindings: ChainableBindingInstruction[]) {
    this.addAdvanceInstructionIfNecessary(
        nodeIndex, bindings.length ? bindings[0].sourceSpan : null);
    this.updateInstructionChain(reference, bindings);
  }

  private addAdvanceInstructionIfNecessary(nodeIndex: number, span: ParseSourceSpan|null) {
    if (nodeIndex !== this._currentIndex) {
      const delta = nodeIndex - this._currentIndex;

      if (delta < 1) {
        throw new Error('advance instruction can only go forwards');
      }

      this.instructionFn(this._updateCodeFns, span, R3.advance, [o.literal(delta)]);
      this._currentIndex = nodeIndex;
    }
  }

  private allocatePureFunctionSlots(numSlots: number): number {
    const originalSlots = this._pureFunctionSlots;
    this._pureFunctionSlots += numSlots;
    return originalSlots;
  }

  private allocateBindingSlots(value: AST|null) {
    this._bindingSlots += value instanceof Interpolation ? value.expressions.length : 1;
  }

  /**
   * Gets an expression that refers to the implicit receiver. The implicit
   * receiver is always the root level context.
   */
  private getImplicitReceiverExpr(): o.ReadVarExpr {
    if (this._implicitReceiverExpr) {
      return this._implicitReceiverExpr;
    }

    return this._implicitReceiverExpr = this.level === 0 ?
        o.variable(CONTEXT_NAME) :
        this._bindingScope.getOrCreateSharedContextVar(0);
  }

  private convertPropertyBinding(value: AST): o.Expression {
    const convertedPropertyBinding = convertPropertyBinding(
        this, this.getImplicitReceiverExpr(), value, this.bindingContext(), BindingForm.TrySimple,
        () => error('Unexpected interpolation'));
    const valExpr = convertedPropertyBinding.currValExpr;
    this._tempVariables.push(...convertedPropertyBinding.stmts);
    return valExpr;
  }

  /**
   * Gets a list of argument expressions to pass to an update instruction expression. Also updates
   * the temp variables state with temp variables that were identified as needing to be created
   * while visiting the arguments.
   * @param value The original expression we will be resolving an arguments list from.
   */
  private getUpdateInstructionArguments(value: AST): o.Expression[] {
    const {args, stmts} =
        convertUpdateArguments(this, this.getImplicitReceiverExpr(), value, this.bindingContext());

    this._tempVariables.push(...stmts);
    return args;
  }

  private matchDirectives(elementName: string, elOrTpl: t.Element|t.Template) {
    if (this.directiveMatcher) {
      const selector = createCssSelector(elementName, getAttrsForDirectiveMatching(elOrTpl));
      this.directiveMatcher.match(
          selector, (cssSelector, staticType) => { this.directives.add(staticType); });
    }
  }

  /**
   * Prepares all attribute expression values for the `TAttributes` array.
   *
   * The purpose of this function is to properly construct an attributes array that
   * is passed into the `elementStart` (or just `element`) functions. Because there
   * are many different types of attributes, the array needs to be constructed in a
   * special way so that `elementStart` can properly evaluate them.
   *
   * The format looks like this:
   *
   * ```
   * attrs = [prop, value, prop2, value2,
   *   PROJECT_AS, selector,
   *   CLASSES, class1, class2,
   *   STYLES, style1, value1, style2, value2,
   *   BINDINGS, name1, name2, name3,
   *   TEMPLATE, name4, name5, name6,
   *   I18N, name7, name8, ...]
   * ```
   *
   * Note that this function will fully ignore all synthetic (@foo) attribute values
   * because those values are intended to always be generated as property instructions.
   */
  private getAttributeExpressions(
      renderAttributes: t.TextAttribute[], inputs: t.BoundAttribute[], outputs: t.BoundEvent[],
      styles?: StylingBuilder, templateAttrs: (t.BoundAttribute|t.TextAttribute)[] = [],
      i18nAttrs: (t.BoundAttribute|t.TextAttribute)[] = []): o.Expression[] {
    const alreadySeen = new Set<string>();
    const attrExprs: o.Expression[] = [];
    let ngProjectAsAttr: t.TextAttribute|undefined;

    renderAttributes.forEach((attr: t.TextAttribute) => {
      if (attr.name === NG_PROJECT_AS_ATTR_NAME) {
        ngProjectAsAttr = attr;
      }
      attrExprs.push(...getAttributeNameLiterals(attr.name), asLiteral(attr.value));
    });

    // Keep ngProjectAs next to the other name, value pairs so we can verify that we match
    // ngProjectAs marker in the attribute name slot.
    if (ngProjectAsAttr) {
      attrExprs.push(...getNgProjectAsLiteral(ngProjectAsAttr));
    }

    function addAttrExpr(key: string | number, value?: o.Expression): void {
      if (typeof key === 'string') {
        if (!alreadySeen.has(key)) {
          attrExprs.push(...getAttributeNameLiterals(key));
          value !== undefined && attrExprs.push(value);
          alreadySeen.add(key);
        }
      } else {
        attrExprs.push(o.literal(key));
      }
    }

    // it's important that this occurs before BINDINGS and TEMPLATE because once `elementStart`
    // comes across the BINDINGS or TEMPLATE markers then it will continue reading each value as
    // as single property value cell by cell.
    if (styles) {
      styles.populateInitialStylingAttrs(attrExprs);
    }

    if (inputs.length || outputs.length) {
      const attrsLengthBeforeInputs = attrExprs.length;

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        // We don't want the animation and attribute bindings in the
        // attributes array since they aren't used for directive matching.
        if (input.type !== BindingType.Animation && input.type !== BindingType.Attribute) {
          addAttrExpr(input.name);
        }
      }

      for (let i = 0; i < outputs.length; i++) {
        const output = outputs[i];
        if (output.type !== ParsedEventType.Animation) {
          addAttrExpr(output.name);
        }
      }

      // this is a cheap way of adding the marker only after all the input/output
      // values have been filtered (by not including the animation ones) and added
      // to the expressions. The marker is important because it tells the runtime
      // code that this is where attributes without values start...
      if (attrExprs.length !== attrsLengthBeforeInputs) {
        attrExprs.splice(attrsLengthBeforeInputs, 0, o.literal(core.AttributeMarker.Bindings));
      }
    }

    if (templateAttrs.length) {
      attrExprs.push(o.literal(core.AttributeMarker.Template));
      templateAttrs.forEach(attr => addAttrExpr(attr.name));
    }

    if (i18nAttrs.length) {
      attrExprs.push(o.literal(core.AttributeMarker.I18n));
      i18nAttrs.forEach(attr => addAttrExpr(attr.name));
    }

    return attrExprs;
  }

  private addToConsts(expression: o.Expression): o.LiteralExpr {
    if (o.isNull(expression)) {
      return o.TYPED_NULL_EXPR;
    }

    // Try to reuse a literal that's already in the array, if possible.
    for (let i = 0; i < this._constants.length; i++) {
      if (this._constants[i].isEquivalent(expression)) {
        return o.literal(i);
      }
    }

    return o.literal(this._constants.push(expression) - 1);
  }

  private addAttrsToConsts(attrs: o.Expression[]): o.LiteralExpr {
    return attrs.length > 0 ? this.addToConsts(o.literalArr(attrs)) : o.TYPED_NULL_EXPR;
  }

  private prepareRefsArray(references: t.Reference[]): o.Expression {
    if (!references || references.length === 0) {
      return o.TYPED_NULL_EXPR;
    }

    const refsParam = flatten(references.map(reference => {
      const slot = this.allocateDataSlot();
      // Generate the update temporary.
      const variableName = this._bindingScope.freshReferenceName();
      const retrievalLevel = this.level;
      const lhs = o.variable(variableName);
      this._bindingScope.set(
          retrievalLevel, reference.name, lhs,
          DeclarationPriority.DEFAULT, (scope: BindingScope, relativeLevel: number) => {
            // e.g. nextContext(2);
            const nextContextStmt =
                relativeLevel > 0 ? [generateNextContextExpr(relativeLevel).toStmt()] : [];

            // e.g. const $foo$ = reference(1);
            const refExpr = lhs.set(o.importExpr(R3.reference).callFn([o.literal(slot)]));
            return nextContextStmt.concat(refExpr.toConstDecl());
          }, true);
      return [reference.name, reference.value];
    }));

    return asLiteral(refsParam);
  }

  private prepareListenerParameter(tagName: string, outputAst: t.BoundEvent, index: number):
      () => o.Expression[] {
    return () => {
      const eventName: string = outputAst.name;
      const bindingFnName = outputAst.type === ParsedEventType.Animation ?
          // synthetic @listener.foo values are treated the exact same as are standard listeners
          prepareSyntheticListenerFunctionName(eventName, outputAst.phase !) :
          sanitizeIdentifier(eventName);
      const handlerName = `${this.templateName}_${tagName}_${bindingFnName}_${index}_listener`;
      const scope = this._bindingScope.nestedScope(this._bindingScope.bindingLevel);
      return prepareEventListenerParameters(outputAst, handlerName, scope);
    };
  }
}

export class ValueConverter extends AstMemoryEfficientTransformer {
  private _pipeBindExprs: FunctionCall[] = [];

  constructor(
      private constantPool: ConstantPool, private allocateSlot: () => number,
      private allocatePureFunctionSlots: (numSlots: number) => number,
      private definePipe:
          (name: string, localName: string, slot: number, value: o.Expression) => void) {
    super();
  }

  // AstMemoryEfficientTransformer
  visitPipe(pipe: BindingPipe, context: any): AST {
    // Allocate a slot to create the pipe
    const slot = this.allocateSlot();
    const slotPseudoLocal = `PIPE:${slot}`;
    // Allocate one slot for the result plus one slot per pipe argument
    const pureFunctionSlot = this.allocatePureFunctionSlots(2 + pipe.args.length);
    const target = new PropertyRead(
        pipe.span, pipe.sourceSpan, new ImplicitReceiver(pipe.span, pipe.sourceSpan),
        slotPseudoLocal);
    const {identifier, isVarLength} = pipeBindingCallInfo(pipe.args);
    this.definePipe(pipe.name, slotPseudoLocal, slot, o.importExpr(identifier));
    const args: AST[] = [pipe.exp, ...pipe.args];
    const convertedArgs: AST[] = isVarLength ?
        this.visitAll([new LiteralArray(pipe.span, pipe.sourceSpan, args)]) :
        this.visitAll(args);

    const pipeBindExpr = new FunctionCall(pipe.span, pipe.sourceSpan, target, [
      new LiteralPrimitive(pipe.span, pipe.sourceSpan, slot),
      new LiteralPrimitive(pipe.span, pipe.sourceSpan, pureFunctionSlot),
      ...convertedArgs,
    ]);
    this._pipeBindExprs.push(pipeBindExpr);
    return pipeBindExpr;
  }

  updatePipeSlotOffsets(bindingSlots: number) {
    this._pipeBindExprs.forEach((pipe: FunctionCall) => {
      // update the slot offset arg (index 1) to account for binding slots
      const slotOffset = pipe.args[1] as LiteralPrimitive;
      (slotOffset.value as number) += bindingSlots;
    });
  }

  visitLiteralArray(array: LiteralArray, context: any): AST {
    return new BuiltinFunctionCall(
        array.span, array.sourceSpan, this.visitAll(array.expressions), values => {
          // If the literal has calculated (non-literal) elements transform it into
          // calls to literal factories that compose the literal and will cache intermediate
          // values.
          const literal = o.literalArr(values);
          return getLiteralFactory(this.constantPool, literal, this.allocatePureFunctionSlots);
        });
  }

  visitLiteralMap(map: LiteralMap, context: any): AST {
    return new BuiltinFunctionCall(map.span, map.sourceSpan, this.visitAll(map.values), values => {
      // If the literal has calculated (non-literal) elements  transform it into
      // calls to literal factories that compose the literal and will cache intermediate
      // values.
      const literal = o.literalMap(values.map(
          (value, index) => ({key: map.keys[index].key, value, quoted: map.keys[index].quoted})));
      return getLiteralFactory(this.constantPool, literal, this.allocatePureFunctionSlots);
    });
  }
}

// Pipes always have at least one parameter, the value they operate on
const pipeBindingIdentifiers = [R3.pipeBind1, R3.pipeBind2, R3.pipeBind3, R3.pipeBind4];

function pipeBindingCallInfo(args: o.Expression[]) {
  const identifier = pipeBindingIdentifiers[args.length];
  return {
    identifier: identifier || R3.pipeBindV,
    isVarLength: !identifier,
  };
}

const pureFunctionIdentifiers = [
  R3.pureFunction0, R3.pureFunction1, R3.pureFunction2, R3.pureFunction3, R3.pureFunction4,
  R3.pureFunction5, R3.pureFunction6, R3.pureFunction7, R3.pureFunction8
];

function pureFunctionCallInfo(args: o.Expression[]) {
  const identifier = pureFunctionIdentifiers[args.length];
  return {
    identifier: identifier || R3.pureFunctionV,
    isVarLength: !identifier,
  };
}

function instruction(
    span: ParseSourceSpan | null, reference: o.ExternalReference,
    params: o.Expression[]): o.Expression {
  return o.importExpr(reference, null, span).callFn(params, span);
}

// e.g. x(2);
function generateNextContextExpr(relativeLevelDiff: number): o.Expression {
  return o.importExpr(R3.nextContext)
      .callFn(relativeLevelDiff > 1 ? [o.literal(relativeLevelDiff)] : []);
}

function getLiteralFactory(
    constantPool: ConstantPool, literal: o.LiteralArrayExpr | o.LiteralMapExpr,
    allocateSlots: (numSlots: number) => number): o.Expression {
  const {literalFactory, literalFactoryArguments} = constantPool.getLiteralFactory(literal);
  // Allocate 1 slot for the result plus 1 per argument
  const startSlot = allocateSlots(1 + literalFactoryArguments.length);
  const {identifier, isVarLength} = pureFunctionCallInfo(literalFactoryArguments);

  // Literal factories are pure functions that only need to be re-invoked when the parameters
  // change.
  const args = [o.literal(startSlot), literalFactory];

  if (isVarLength) {
    args.push(o.literalArr(literalFactoryArguments));
  } else {
    args.push(...literalFactoryArguments);
  }

  return o.importExpr(identifier).callFn(args);
}

/**
 * Gets an array of literals that can be added to an expression
 * to represent the name and namespace of an attribute. E.g.
 * `:xlink:href` turns into `[AttributeMarker.NamespaceURI, 'xlink', 'href']`.
 *
 * @param name Name of the attribute, including the namespace.
 */
function getAttributeNameLiterals(name: string): o.LiteralExpr[] {
  const [attributeNamespace, attributeName] = splitNsName(name);
  const nameLiteral = o.literal(attributeName);

  if (attributeNamespace) {
    return [
      o.literal(core.AttributeMarker.NamespaceURI), o.literal(attributeNamespace), nameLiteral
    ];
  }

  return [nameLiteral];
}

/**
 * Function which is executed whenever a variable is referenced for the first time in a given
 * scope.
 *
 * It is expected that the function creates the `const localName = expression`; statement.
 */
export type DeclareLocalVarCallback = (scope: BindingScope, relativeLevel: number) => o.Statement[];

/** The prefix used to get a shared context in BindingScope's map. */
const SHARED_CONTEXT_KEY = '$$shared_ctx$$';

/**
 * This is used when one refers to variable such as: 'let abc = nextContext(2).$implicit`.
 * - key to the map is the string literal `"abc"`.
 * - value `retrievalLevel` is the level from which this value can be retrieved, which is 2 levels
 * up in example.
 * - value `lhs` is the left hand side which is an AST representing `abc`.
 * - value `declareLocalCallback` is a callback that is invoked when declaring the local.
 * - value `declare` is true if this value needs to be declared.
 * - value `localRef` is true if we are storing a local reference
 * - value `priority` dictates the sorting priority of this var declaration compared
 * to other var declarations on the same retrieval level. For example, if there is a
 * context variable and a local ref accessing the same parent view, the context var
 * declaration should always come before the local ref declaration.
 */
type BindingData = {
  retrievalLevel: number; lhs: o.Expression; declareLocalCallback?: DeclareLocalVarCallback;
  declare: boolean;
  priority: number;
  localRef: boolean;
};

/**
 * The sorting priority of a local variable declaration. Higher numbers
 * mean the declaration will appear first in the generated code.
 */
const enum DeclarationPriority { DEFAULT = 0, CONTEXT = 1, SHARED_CONTEXT = 2 }

export class BindingScope implements LocalResolver {
  /** Keeps a map from local variables to their BindingData. */
  private map = new Map<string, BindingData>();
  private referenceNameIndex = 0;
  private restoreViewVariable: o.ReadVarExpr|null = null;
  private static _ROOT_SCOPE: BindingScope;

  static get ROOT_SCOPE(): BindingScope {
    if (!BindingScope._ROOT_SCOPE) {
      BindingScope._ROOT_SCOPE = new BindingScope().set(0, '$event', o.variable('$event'));
    }
    return BindingScope._ROOT_SCOPE;
  }

  private constructor(public bindingLevel: number = 0, private parent: BindingScope|null = null) {}

  get(name: string): o.Expression|null {
    let current: BindingScope|null = this;
    while (current) {
      let value = current.map.get(name);
      if (value != null) {
        if (current !== this) {
          // make a local copy and reset the `declare` state
          value = {
            retrievalLevel: value.retrievalLevel,
            lhs: value.lhs,
            declareLocalCallback: value.declareLocalCallback,
            declare: false,
            priority: value.priority,
            localRef: value.localRef
          };

          // Cache the value locally.
          this.map.set(name, value);
          // Possibly generate a shared context var
          this.maybeGenerateSharedContextVar(value);
          this.maybeRestoreView(value.retrievalLevel, value.localRef);
        }

        if (value.declareLocalCallback && !value.declare) {
          value.declare = true;
        }
        return value.lhs;
      }
      current = current.parent;
    }

    // If we get to this point, we are looking for a property on the top level component
    // - If level === 0, we are on the top and don't need to re-declare `ctx`.
    // - If level > 0, we are in an embedded view. We need to retrieve the name of the
    // local var we used to store the component context, e.g. const $comp$ = x();
    return this.bindingLevel === 0 ? null : this.getComponentProperty(name);
  }

  /**
   * Create a local variable for later reference.
   *
   * @param retrievalLevel The level from which this value can be retrieved
   * @param name Name of the variable.
   * @param lhs AST representing the left hand side of the `let lhs = rhs;`.
   * @param priority The sorting priority of this var
   * @param declareLocalCallback The callback to invoke when declaring this local var
   * @param localRef Whether or not this is a local ref
   */
  set(retrievalLevel: number, name: string, lhs: o.Expression,
      priority: number = DeclarationPriority.DEFAULT,
      declareLocalCallback?: DeclareLocalVarCallback, localRef?: true): BindingScope {
    if (this.map.has(name)) {
      if (localRef) {
        // Do not throw an error if it's a local ref and do not update existing value,
        // so the first defined ref is always returned.
        return this;
      }
      error(`The name ${name} is already defined in scope to be ${this.map.get(name)}`);
    }
    this.map.set(name, {
      retrievalLevel: retrievalLevel,
      lhs: lhs,
      declare: false,
      declareLocalCallback: declareLocalCallback,
      priority: priority,
      localRef: localRef || false
    });
    return this;
  }

  // Implemented as part of LocalResolver.
  getLocal(name: string): (o.Expression|null) { return this.get(name); }

  // Implemented as part of LocalResolver.
  notifyImplicitReceiverUse(): void {
    if (this.bindingLevel !== 0) {
      // Since the implicit receiver is accessed in an embedded view, we need to
      // ensure that we declare a shared context variable for the current template
      // in the update variables.
      this.map.get(SHARED_CONTEXT_KEY + 0) !.declare = true;
    }
  }

  nestedScope(level: number): BindingScope {
    const newScope = new BindingScope(level, this);
    if (level > 0) newScope.generateSharedContextVar(0);
    return newScope;
  }

  /**
   * Gets or creates a shared context variable and returns its expression. Note that
   * this does not mean that the shared variable will be declared. Variables in the
   * binding scope will be only declared if they are used.
   */
  getOrCreateSharedContextVar(retrievalLevel: number): o.ReadVarExpr {
    const bindingKey = SHARED_CONTEXT_KEY + retrievalLevel;
    if (!this.map.has(bindingKey)) {
      this.generateSharedContextVar(retrievalLevel);
    }
    // Shared context variables are always generated as "ReadVarExpr".
    return this.map.get(bindingKey) !.lhs as o.ReadVarExpr;
  }

  getSharedContextName(retrievalLevel: number): o.ReadVarExpr|null {
    const sharedCtxObj = this.map.get(SHARED_CONTEXT_KEY + retrievalLevel);
    // Shared context variables are always generated as "ReadVarExpr".
    return sharedCtxObj && sharedCtxObj.declare ? sharedCtxObj.lhs as o.ReadVarExpr : null;
  }

  maybeGenerateSharedContextVar(value: BindingData) {
    if (value.priority === DeclarationPriority.CONTEXT &&
        value.retrievalLevel < this.bindingLevel) {
      const sharedCtxObj = this.map.get(SHARED_CONTEXT_KEY + value.retrievalLevel);
      if (sharedCtxObj) {
        sharedCtxObj.declare = true;
      } else {
        this.generateSharedContextVar(value.retrievalLevel);
      }
    }
  }

  generateSharedContextVar(retrievalLevel: number) {
    const lhs = o.variable(CONTEXT_NAME + this.freshReferenceName());
    this.map.set(SHARED_CONTEXT_KEY + retrievalLevel, {
      retrievalLevel: retrievalLevel,
      lhs: lhs,
      declareLocalCallback: (scope: BindingScope, relativeLevel: number) => {
        // const ctx_r0 = nextContext(2);
        return [lhs.set(generateNextContextExpr(relativeLevel)).toConstDecl()];
      },
      declare: false,
      priority: DeclarationPriority.SHARED_CONTEXT,
      localRef: false
    });
  }

  getComponentProperty(name: string): o.Expression {
    const componentValue = this.map.get(SHARED_CONTEXT_KEY + 0) !;
    componentValue.declare = true;
    this.maybeRestoreView(0, false);
    return componentValue.lhs.prop(name);
  }

  maybeRestoreView(retrievalLevel: number, localRefLookup: boolean) {
    // We want to restore the current view in listener fns if:
    // 1 - we are accessing a value in a parent view, which requires walking the view tree rather
    // than using the ctx arg. In this case, the retrieval and binding level will be different.
    // 2 - we are looking up a local ref, which requires restoring the view where the local
    // ref is stored
    if (this.isListenerScope() && (retrievalLevel < this.bindingLevel || localRefLookup)) {
      if (!this.parent !.restoreViewVariable) {
        // parent saves variable to generate a shared `const $s$ = getCurrentView();` instruction
        this.parent !.restoreViewVariable = o.variable(this.parent !.freshReferenceName());
      }
      this.restoreViewVariable = this.parent !.restoreViewVariable;
    }
  }

  restoreViewStatement(): o.Statement[] {
    // restoreView($state$);
    return this.restoreViewVariable ?
        [instruction(null, R3.restoreView, [this.restoreViewVariable]).toStmt()] :
        [];
  }

  viewSnapshotStatements(): o.Statement[] {
    // const $state$ = getCurrentView();
    const getCurrentViewInstruction = instruction(null, R3.getCurrentView, []);
    return this.restoreViewVariable ?
        [this.restoreViewVariable.set(getCurrentViewInstruction).toConstDecl()] :
        [];
  }

  isListenerScope() { return this.parent && this.parent.bindingLevel === this.bindingLevel; }

  variableDeclarations(): o.Statement[] {
    let currentContextLevel = 0;
    return Array.from(this.map.values())
        .filter(value => value.declare)
        .sort((a, b) => b.retrievalLevel - a.retrievalLevel || b.priority - a.priority)
        .reduce((stmts: o.Statement[], value: BindingData) => {
          const levelDiff = this.bindingLevel - value.retrievalLevel;
          const currStmts = value.declareLocalCallback !(this, levelDiff - currentContextLevel);
          currentContextLevel = levelDiff;
          return stmts.concat(currStmts);
        }, []) as o.Statement[];
  }


  freshReferenceName(): string {
    let current: BindingScope = this;
    // Find the top scope as it maintains the global reference count
    while (current.parent) current = current.parent;
    const ref = `${REFERENCE_PREFIX}${current.referenceNameIndex++}`;
    return ref;
  }
}

/**
 * Creates a `CssSelector` given a tag name and a map of attributes
 */
export function createCssSelector(
    elementName: string, attributes: {[name: string]: string}): CssSelector {
  const cssSelector = new CssSelector();
  const elementNameNoNs = splitNsName(elementName)[1];

  cssSelector.setElement(elementNameNoNs);

  Object.getOwnPropertyNames(attributes).forEach((name) => {
    const nameNoNs = splitNsName(name)[1];
    const value = attributes[name];

    cssSelector.addAttribute(nameNoNs, value);
    if (name.toLowerCase() === 'class') {
      const classes = value.trim().split(/\s+/);
      classes.forEach(className => cssSelector.addClassName(className));
    }
  });

  return cssSelector;
}

/**
 * Creates an array of expressions out of an `ngProjectAs` attributes
 * which can be added to the instruction parameters.
 */
function getNgProjectAsLiteral(attribute: t.TextAttribute): o.Expression[] {
  // Parse the attribute value into a CssSelectorList. Note that we only take the
  // first selector, because we don't support multiple selectors in ngProjectAs.
  const parsedR3Selector = core.parseSelectorToR3Selector(attribute.value)[0];
  return [o.literal(core.AttributeMarker.ProjectAs), asLiteral(parsedR3Selector)];
}

/**
 * Gets the instruction to generate for an interpolated property
 * @param interpolation An Interpolation AST
 */
function getPropertyInterpolationExpression(interpolation: Interpolation) {
  switch (getInterpolationArgsLength(interpolation)) {
    case 1:
      return R3.propertyInterpolate;
    case 3:
      return R3.propertyInterpolate1;
    case 5:
      return R3.propertyInterpolate2;
    case 7:
      return R3.propertyInterpolate3;
    case 9:
      return R3.propertyInterpolate4;
    case 11:
      return R3.propertyInterpolate5;
    case 13:
      return R3.propertyInterpolate6;
    case 15:
      return R3.propertyInterpolate7;
    case 17:
      return R3.propertyInterpolate8;
    default:
      return R3.propertyInterpolateV;
  }
}

/**
 * Gets the instruction to generate for an interpolated attribute
 * @param interpolation An Interpolation AST
 */
function getAttributeInterpolationExpression(interpolation: Interpolation) {
  switch (getInterpolationArgsLength(interpolation)) {
    case 3:
      return R3.attributeInterpolate1;
    case 5:
      return R3.attributeInterpolate2;
    case 7:
      return R3.attributeInterpolate3;
    case 9:
      return R3.attributeInterpolate4;
    case 11:
      return R3.attributeInterpolate5;
    case 13:
      return R3.attributeInterpolate6;
    case 15:
      return R3.attributeInterpolate7;
    case 17:
      return R3.attributeInterpolate8;
    default:
      return R3.attributeInterpolateV;
  }
}

/**
 * Gets the instruction to generate for interpolated text.
 * @param interpolation An Interpolation AST
 */
function getTextInterpolationExpression(interpolation: Interpolation): o.ExternalReference {
  switch (getInterpolationArgsLength(interpolation)) {
    case 1:
      return R3.textInterpolate;
    case 3:
      return R3.textInterpolate1;
    case 5:
      return R3.textInterpolate2;
    case 7:
      return R3.textInterpolate3;
    case 9:
      return R3.textInterpolate4;
    case 11:
      return R3.textInterpolate5;
    case 13:
      return R3.textInterpolate6;
    case 15:
      return R3.textInterpolate7;
    case 17:
      return R3.textInterpolate8;
    default:
      return R3.textInterpolateV;
  }
}

/**
 * Options that can be used to modify how a template is parsed by `parseTemplate()`.
 */
export interface ParseTemplateOptions {
  /**
   * Include whitespace nodes in the parsed output.
   */
  preserveWhitespaces?: boolean;
  /**
   * How to parse interpolation markers.
   */
  interpolationConfig?: InterpolationConfig;
  /**
   * The start and end point of the text to parse within the `source` string.
   * The entire `source` string is parsed if this is not provided.
   * */
  range?: LexerRange;
  /**
   * If this text is stored in a JavaScript string, then we have to deal with escape sequences.
   *
   * **Example 1:**
   *
   * ```
   * "abc\"def\nghi"
   * ```
   *
   * - The `\"` must be converted to `"`.
   * - The `\n` must be converted to a new line character in a token,
   *   but it should not increment the current line for source mapping.
   *
   * **Example 2:**
   *
   * ```
   * "abc\
   *  def"
   * ```
   *
   * The line continuation (`\` followed by a newline) should be removed from a token
   * but the new line should increment the current line for source mapping.
   */
  escapedString?: boolean;
  /**
   * An array of characters that should be considered as leading trivia.
   * Leading trivia are characters that are not important to the developer, and so should not be
   * included in source-map segments.  A common example is whitespace.
   */
  leadingTriviaChars?: string[];

  /**
   * Render `$localize` message ids with additional legacy message ids.
   *
   * This option defaults to `true` but in the future the defaul will be flipped.
   *
   * For now set this option to false if you have migrated the translation files to use the new
   * `$localize` message id format and you are not using compile time translation merging.
   */
  enableI18nLegacyMessageIdFormat?: boolean;
}

/**
 * Parse a template into render3 `Node`s and additional metadata, with no other dependencies.
 *
 * @param template text of the template to parse
 * @param templateUrl URL to use for source mapping of the parsed template
 * @param options options to modify how the template is parsed
 */
export function parseTemplate(
    template: string, templateUrl: string, options: ParseTemplateOptions = {}): {
  errors?: ParseError[],
  nodes: t.Node[],
  styleUrls: string[],
  styles: string[],
  ngContentSelectors: string[]
} {
  const {interpolationConfig, preserveWhitespaces, enableI18nLegacyMessageIdFormat} = options;
  const bindingParser = makeBindingParser(interpolationConfig);
  const htmlParser = new HtmlParser();
  const parseResult = htmlParser.parse(
      template, templateUrl,
      {leadingTriviaChars: LEADING_TRIVIA_CHARS, ...options, tokenizeExpansionForms: true});

  if (parseResult.errors && parseResult.errors.length > 0) {
    return {
      errors: parseResult.errors,
      nodes: [],
      styleUrls: [],
      styles: [],
      ngContentSelectors: []
    };
  }

  let rootNodes: html.Node[] = parseResult.rootNodes;

  // process i18n meta information (scan attributes, generate ids)
  // before we run whitespace removal process, because existing i18n
  // extraction process (ng xi18n) relies on a raw content to generate
  // message ids
  const i18nMetaVisitor = new I18nMetaVisitor(
      interpolationConfig, /* keepI18nAttrs */ !preserveWhitespaces,
      enableI18nLegacyMessageIdFormat);
  rootNodes = html.visitAll(i18nMetaVisitor, rootNodes);

  if (!preserveWhitespaces) {
    rootNodes = html.visitAll(new WhitespaceVisitor(), rootNodes);

    // run i18n meta visitor again in case whitespaces are removed (because that might affect
    // generated i18n message content) and first pass indicated that i18n content is present in a
    // template. During this pass i18n IDs generated at the first pass will be preserved, so we can
    // mimic existing extraction process (ng xi18n)
    if (i18nMetaVisitor.hasI18nMeta) {
      rootNodes = html.visitAll(
          new I18nMetaVisitor(interpolationConfig, /* keepI18nAttrs */ false), rootNodes);
    }
  }

  const {nodes, errors, styleUrls, styles, ngContentSelectors} =
      htmlAstToRender3Ast(rootNodes, bindingParser);
  if (errors && errors.length > 0) {
    return {errors, nodes: [], styleUrls: [], styles: [], ngContentSelectors: []};
  }

  return {nodes, styleUrls, styles, ngContentSelectors};
}

const elementRegistry = new DomElementSchemaRegistry();

/**
 * Construct a `BindingParser` with a default configuration.
 */
export function makeBindingParser(
    interpolationConfig: InterpolationConfig = DEFAULT_INTERPOLATION_CONFIG): BindingParser {
  return new BindingParser(
      new IvyParser(new Lexer()), interpolationConfig, elementRegistry, null, []);
}

export function resolveSanitizationFn(context: core.SecurityContext, isAttribute?: boolean) {
  switch (context) {
    case core.SecurityContext.HTML:
      return o.importExpr(R3.sanitizeHtml);
    case core.SecurityContext.SCRIPT:
      return o.importExpr(R3.sanitizeScript);
    case core.SecurityContext.STYLE:
      // the compiler does not fill in an instruction for [style.prop?] binding
      // values because the style algorithm knows internally what props are subject
      // to sanitization (only [attr.style] values are explicitly sanitized)
      return isAttribute ? o.importExpr(R3.sanitizeStyle) : null;
    case core.SecurityContext.URL:
      return o.importExpr(R3.sanitizeUrl);
    case core.SecurityContext.RESOURCE_URL:
      return o.importExpr(R3.sanitizeResourceUrl);
    default:
      return null;
  }
}

function isSingleElementTemplate(children: t.Node[]): children is[t.Element] {
  return children.length === 1 && children[0] instanceof t.Element;
}

function isTextNode(node: t.Node): boolean {
  return node instanceof t.Text || node instanceof t.BoundText || node instanceof t.Icu;
}

function hasTextChildrenOnly(children: t.Node[]): boolean {
  return children.every(isTextNode);
}

interface ChainableBindingInstruction {
  name?: string;
  sourceSpan: ParseSourceSpan|null;
  value: () => o.Expression | o.Expression[];
  params?: any[];
}

/** Name of the global variable that is used to determine if we use Closure translations or not */
const NG_I18N_CLOSURE_MODE = 'ngI18nClosureMode';

/**
 * Generate statements that define a given translation message.
 *
 * ```
 * var I18N_1;
 * if (typeof ngI18nClosureMode !== undefined && ngI18nClosureMode) {
 *     var MSG_EXTERNAL_XXX = goog.getMsg(
 *          "Some message with {$interpolation}!",
 *          { "interpolation": "\uFFFD0\uFFFD" }
 *     );
 *     I18N_1 = MSG_EXTERNAL_XXX;
 * }
 * else {
 *     I18N_1 = $localize`Some message with ${'\uFFFD0\uFFFD'}!`;
 * }
 * ```
 *
 * @param message The original i18n AST message node
 * @param variable The variable that will be assigned the translation, e.g. `I18N_1`.
 * @param closureVar The variable for Closure `goog.getMsg` calls, e.g. `MSG_EXTERNAL_XXX`.
 * @param params Object mapping placeholder names to their values (e.g.
 * `{ "interpolation": "\uFFFD0\uFFFD" }`).
 * @param transformFn Optional transformation function that will be applied to the translation (e.g.
 * post-processing).
 * @returns An array of statements that defined a given translation.
 */
export function getTranslationDeclStmts(
    message: i18n.Message, variable: o.ReadVarExpr, closureVar: o.ReadVarExpr,
    params: {[name: string]: o.Expression} = {},
    transformFn?: (raw: o.ReadVarExpr) => o.Expression): o.Statement[] {
  const statements: o.Statement[] = [
    declareI18nVariable(variable),
    o.ifStmt(
        createClosureModeGuard(), createGoogleGetMsgStatements(
                                      variable, message, closureVar,
                                      i18nFormatPlaceholderNames(params, /* useCamelCase */ true)),
        createLocalizeStatements(
            variable, message, i18nFormatPlaceholderNames(params, /* useCamelCase */ false))),
  ];

  if (transformFn) {
    statements.push(new o.ExpressionStatement(variable.set(transformFn(variable))));
  }

  return statements;
}

/**
 * Create the expression that will be used to guard the closure mode block
 * It is equivalent to:
 *
 * ```
 * typeof ngI18nClosureMode !== undefined && ngI18nClosureMode
 * ```
 */
function createClosureModeGuard(): o.BinaryOperatorExpr {
  return o.typeofExpr(o.variable(NG_I18N_CLOSURE_MODE))
      .notIdentical(o.literal('undefined', o.STRING_TYPE))
      .and(o.variable(NG_I18N_CLOSURE_MODE));
}
