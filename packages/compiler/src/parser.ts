/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ParsedEvent, ParsedProperty, ParsedVariable } from './exp_parser/ast';
import * as html from './ml_parser/ast';
import { replaceNgsp } from './ml_parser/html_whitespaces';
import { isTemplate } from './ml_parser/tags';
import { ParseError, ParseErrorLevel, ParseSourceSpan } from './util';
import { isStyleUrlResolvable } from './style_url_resolver';
import { BindingParser } from './templ_parser/binding_parser';
import { PreparsedElementType, preparseElement } from './templ_parser/preparser';

import * as t from './ast';

const BIND_NAME_REGEXP = /^(?:(bind-)|(let-)|(ref-|#)|(on-)|(bindon-)|(@))(.*)$/;

// Group 1 = "bind-"
const KW_BIND_IDX = 1;
// Group 2 = "let-"
const KW_LET_IDX = 2;
// Group 3 = "ref-/#"
const KW_REF_IDX = 3;
// Group 4 = "on-"
const KW_ON_IDX = 4;
// Group 5 = "bindon-"
const KW_BINDON_IDX = 5;
// Group 6 = "@"
const KW_AT_IDX = 6;
// Group 7 = the identifier after "bind-", "let-", "ref-/#", "on-", "bindon-" or "@"
const IDENT_KW_IDX = 7;

const BINDING_DELIMS = {
  BANANA_BOX: { start: '[(', end: ')]' },
  PROPERTY: { start: '[', end: ']' },
  EVENT: { start: '(', end: ')' },
};

const TEMPLATE_ATTR_PREFIX = '*';

// Result of the html AST to Ivy AST transformation
export interface Render3ParseResult {
  nodes: t.Node[];
  errors: ParseError[];
  styles: string[];
  styleUrls: string[];
  contentSelectors: string[];
  // Will be defined if `Render3ParseOptions['collectCommentNodes']` is true
  commentNodes?: t.Comment[];
}

interface Render3ParseOptions {
  collectCommentNodes: boolean;
}

export function htmlAstToRender3Ast(
  htmlNodes: html.Node[], bindingParser: BindingParser,
  options: Render3ParseOptions): Render3ParseResult {
  const transformer = new HtmlAstToIvyAst(bindingParser, options);
  const ivyNodes = html.visitAll(transformer, htmlNodes);

  // Errors might originate in either the binding parser or the html to ivy transformer
  const allErrors = bindingParser.errors.concat(transformer.errors);

  const result: Render3ParseResult = {
    nodes: ivyNodes,
    errors: allErrors,
    styleUrls: transformer.styleUrls,
    styles: transformer.styles,
    contentSelectors: transformer.contentSelectors
  };
  if (options.collectCommentNodes) {
    result.commentNodes = transformer.commentNodes;
  }
  return result;
}

class HtmlAstToIvyAst implements html.Visitor {
  errors: ParseError[] = [];
  styles: string[] = [];
  styleUrls: string[] = [];
  contentSelectors: string[] = [];
  // This array will be populated if `Render3ParseOptions['collectCommentNodes']` is true
  commentNodes: t.Comment[] = [];
  private inI18nBlock = false;

  constructor(private bindingParser: BindingParser, private options: Render3ParseOptions) { }

  // HTML visitor
  visitElement(element: html.Element): t.Node | null {
    const preparsedElement = preparseElement(element);
    if (preparsedElement.type === PreparsedElementType.SCRIPT) {
      return null;
    } else if (preparsedElement.type === PreparsedElementType.STYLE) {
      const contents = textContents(element);
      if (contents !== null) {
        this.styles.push(contents);
      }
      return null;
    } else if (
      preparsedElement.type === PreparsedElementType.STYLESHEET &&
      isStyleUrlResolvable(preparsedElement.hrefAttr)) {
      this.styleUrls.push(preparsedElement.hrefAttr);
      return null;
    }

    // Whether the element is a `<v-template>`
    const isTemplateElement = isTemplate(element.name);

    const parsedProperties: ParsedProperty[] = [];
    const boundEvents: t.BoundEvent[] = [];
    const variables: t.Variable[] = [];
    const references: t.Reference[] = [];
    const attributes: t.TextAttribute[] = [];

    const templateParsedProperties: ParsedProperty[] = [];
    const templateVariables: t.Variable[] = [];

    // Whether the element has any *-attribute
    let elementHasInlineTemplate = false;

    for (const attribute of element.attrs) {
      let hasBinding = false;
      const normalizedName = normalizeAttributeName(attribute.name);

      // `*attr` defines template bindings
      let isTemplateBinding = false;

      if (normalizedName.startsWith(TEMPLATE_ATTR_PREFIX)) {
        // *-attributes
        if (elementHasInlineTemplate) {
          this.reportError(
            `Can't have multiple template bindings on one element. Use only one attribute prefixed with *`,
            attribute.sourceSpan);
        }
        isTemplateBinding = true;
        elementHasInlineTemplate = true;
        const templateValue = attribute.value;
        const templateKey = normalizedName.substring(TEMPLATE_ATTR_PREFIX.length);

        const parsedVariables: ParsedVariable[] = [];
        const absoluteValueOffset = attribute.valueSpan ?
          attribute.valueSpan.start.offset :
          // If there is no value span the attribute does not have a value, like `attr` in
          //`<div attr></div>`. In this case, point to one character beyond the last character of
          // the attribute name.
          attribute.sourceSpan.start.offset + attribute.name.length;

        this.bindingParser.parseInlineTemplateBinding(
          templateKey, templateValue, attribute.sourceSpan, absoluteValueOffset, [],
          templateParsedProperties, parsedVariables, true /* isIvyAst */);
        templateVariables.push(...parsedVariables.map(
          v => new t.Variable(v.name, v.value, v.sourceSpan, v.keySpan, v.valueSpan)));
      } else {
        // Check for variables, events, property bindings, interpolation
        hasBinding = this.parseAttribute(
          isTemplateElement, attribute, [], parsedProperties, boundEvents, variables, references);
      }

      if (!hasBinding && !isTemplateBinding) {
        // don't include the bindings as attributes as well in the AST
        attributes.push(this.visitAttribute(attribute));
      }
    }

    const children: t.Node[] =
      html.visitAll(preparsedElement.nonBindable ? NON_BINDABLE_VISITOR : this, element.children);

    let parsedElement: t.Node | undefined;
    if (preparsedElement.type === PreparsedElementType.NG_CONTENT) {
      // `<v-content>`
      if (element.children &&
        !element.children.every(
          (node: html.Node) => isEmptyTextNode(node) || isCommentNode(node))) {
        this.reportError(`<v-content> element cannot have content.`, element.sourceSpan);
      }
      const selector = preparsedElement.selectAttr;
      const attrs: t.TextAttribute[] = element.attrs.map(attr => this.visitAttribute(attr));
      parsedElement = new t.Content(selector, attrs, element.sourceSpan);

      this.contentSelectors.push(selector);
    } else if (isTemplateElement) {
      // `<v-template>`
      const attrs = this.extractAttributes(element.name, parsedProperties);

      parsedElement = new t.Template(
        element.name, attributes, attrs.bound, boundEvents, [/* no template attributes */],
        children, references, variables, element.sourceSpan, element.startSourceSpan,
        element.endSourceSpan);
    } else {
      const attrs = this.extractAttributes(element.name, parsedProperties);
      parsedElement = new t.Element(
        element.name, attributes, attrs.bound, boundEvents, children, references,
        element.sourceSpan, element.startSourceSpan, element.endSourceSpan);
    }

    if (elementHasInlineTemplate) {
      // If this node is an inline-template (e.g. has *for) then we need to create a template
      // node that contains this node.
      // Moreover, if the node is an element, then we need to hoist its attributes to the template
      // node for matching against content projection selectors.
      const attrs = this.extractAttributes('v-template', templateParsedProperties);
      const templateAttrs: (t.TextAttribute | t.BoundAttribute)[] = [];
      attrs.literal.forEach(attr => templateAttrs.push(attr));
      attrs.bound.forEach(attr => templateAttrs.push(attr));
      const hoistedAttrs = parsedElement instanceof t.Element ?
        {
          attributes: parsedElement.attributes,
          inputs: parsedElement.inputs,
          outputs: parsedElement.outputs,
        } :
        { attributes: [], inputs: [], outputs: [] };


      // TODO(pk): test for this case
      parsedElement = new t.Template(
        (parsedElement as t.Element | t.Content).name, hoistedAttrs.attributes,
        hoistedAttrs.inputs, hoistedAttrs.outputs, templateAttrs, [parsedElement],
        [/* no references */], templateVariables, element.sourceSpan, element.startSourceSpan,
        element.endSourceSpan);
    }
    return parsedElement;
  }

  visitAttribute(attribute: html.Attribute): t.TextAttribute {
    return new t.TextAttribute(
      attribute.name, attribute.value, attribute.sourceSpan, attribute.keySpan,
      attribute.valueSpan);
  }

  visitText(text: html.Text): t.Node {
    return this._visitTextWithInterpolation(text.value, text.sourceSpan);
  }

  visitExpansion(expansion: html.Expansion): null {
    return null;
  }

  visitExpansionCase(expansionCase: html.ExpansionCase): null {
    return null;
  }

  visitComment(comment: html.Comment): null {
    if (this.options.collectCommentNodes) {
      this.commentNodes.push(new t.Comment(comment.value || '', comment.sourceSpan));
    }
    return null;
  }

  // convert view engine `ParsedProperty` to a format suitable for IVY
  private extractAttributes(elementName: string, properties: ParsedProperty[]): { bound: t.BoundAttribute[], literal: t.TextAttribute[] } {
    const bound: t.BoundAttribute[] = [];
    const literal: t.TextAttribute[] = [];

    properties.forEach(prop => {
      if (prop.isLiteral) {
        literal.push(new t.TextAttribute(
          prop.name, prop.expression.source || '', prop.sourceSpan, prop.keySpan, prop.valueSpan
        ));
      } else {
        // Note that validation is skipped and property mapping is disabled
        // due to the fact that we need to make sure a given prop is not an
        // input of a directive and directive matching happens at runtime.
        const bep = this.bindingParser.createBoundElementProperty(
          elementName, prop, /* skipValidation */ true, /* mapPropertyName */ false);
        bound.push(t.BoundAttribute.fromBoundElementProperty(bep));
      }
    });

    return { bound, literal };
  }

  private parseAttribute(
    isTemplateElement: boolean, attribute: html.Attribute, matchableAttributes: string[][],
    parsedProperties: ParsedProperty[], boundEvents: t.BoundEvent[], variables: t.Variable[],
    references: t.Reference[]) {
    const name = normalizeAttributeName(attribute.name);
    const value = attribute.value;
    const srcSpan = attribute.sourceSpan;
    const absoluteOffset =
      attribute.valueSpan ? attribute.valueSpan.start.offset : srcSpan.start.offset;

    function createKeySpan(srcSpan: ParseSourceSpan, prefix: string, identifier: string) {
      // We need to adjust the start location for the keySpan to account for the removed 'data-'
      // prefix from `normalizeAttributeName`.
      const normalizationAdjustment = attribute.name.length - name.length;
      const keySpanStart = srcSpan.start.moveBy(prefix.length + normalizationAdjustment);
      const keySpanEnd = keySpanStart.moveBy(identifier.length);
      return new ParseSourceSpan(keySpanStart, keySpanEnd, keySpanStart, identifier);
    }

    const bindParts = name.match(BIND_NAME_REGEXP);

    if (bindParts) {
      if (bindParts[KW_BIND_IDX] != null) {
        const identifier = bindParts[IDENT_KW_IDX];
        const keySpan = createKeySpan(srcSpan, bindParts[KW_BIND_IDX], identifier);
        this.bindingParser.parsePropertyBinding(
          identifier, value, false, srcSpan, absoluteOffset, attribute.valueSpan,
          matchableAttributes, parsedProperties, keySpan);

      } else if (bindParts[KW_LET_IDX]) {
        if (isTemplateElement) {
          const identifier = bindParts[IDENT_KW_IDX];
          const keySpan = createKeySpan(srcSpan, bindParts[KW_LET_IDX], identifier);
          this.parseVariable(identifier, value, srcSpan, keySpan, attribute.valueSpan, variables);
        } else {
          this.reportError(`"let-" is only supported on v-template elements.`, srcSpan);
        }

      } else if (bindParts[KW_REF_IDX]) {
        const identifier = bindParts[IDENT_KW_IDX];
        const keySpan = createKeySpan(srcSpan, bindParts[KW_REF_IDX], identifier);
        this.parseReference(identifier, value, srcSpan, keySpan, attribute.valueSpan, references);
      } else if (bindParts[KW_ON_IDX]) {
        const events: ParsedEvent[] = [];
        const identifier = bindParts[IDENT_KW_IDX];
        const keySpan = createKeySpan(srcSpan, bindParts[KW_ON_IDX], identifier);
        this.bindingParser.parseEvent(
          identifier, value, srcSpan, attribute.valueSpan || srcSpan, matchableAttributes, events,
          keySpan);
        addEvents(events, boundEvents);
      } else if (bindParts[KW_BINDON_IDX]) {
        const identifier = bindParts[IDENT_KW_IDX];
        const keySpan = createKeySpan(srcSpan, bindParts[KW_BINDON_IDX], identifier);
        this.bindingParser.parsePropertyBinding(
          identifier, value, false, srcSpan, absoluteOffset, attribute.valueSpan,
          matchableAttributes, parsedProperties, keySpan);
        this.parseAssignmentEvent(
          identifier, value, srcSpan, attribute.valueSpan, matchableAttributes, boundEvents,
          keySpan);
      } else if (bindParts[KW_AT_IDX]) {
        const keySpan = createKeySpan(srcSpan, '', name);
        this.bindingParser.parseLiteralAttr(
          name, value, srcSpan, absoluteOffset, attribute.valueSpan, matchableAttributes,
          parsedProperties, keySpan);
      }
      return true;
    }

    // We didn't see a kw-prefixed property binding, but we have not yet checked
    // for the []/()/[()] syntax.
    let delims: { start: string, end: string } | null = null;
    if (name.startsWith(BINDING_DELIMS.BANANA_BOX.start)) {
      delims = BINDING_DELIMS.BANANA_BOX;
    } else if (name.startsWith(BINDING_DELIMS.PROPERTY.start)) {
      delims = BINDING_DELIMS.PROPERTY;
    } else if (name.startsWith(BINDING_DELIMS.EVENT.start)) {
      delims = BINDING_DELIMS.EVENT;
    }
    if (delims !== null &&
      // NOTE: older versions of the parser would match a start/end delimited
      // binding iff the property name was terminated by the ending delimiter
      // and the identifier in the binding was non-empty.
      // TODO(ayazhafiz): update this to handle malformed bindings.
      name.endsWith(delims.end) && name.length > delims.start.length + delims.end.length) {
      const identifier = name.substring(delims.start.length, name.length - delims.end.length);
      const keySpan = createKeySpan(srcSpan, delims.start, identifier);
      if (delims.start === BINDING_DELIMS.BANANA_BOX.start) {
        this.bindingParser.parsePropertyBinding(
          identifier, value, false, srcSpan, absoluteOffset, attribute.valueSpan,
          matchableAttributes, parsedProperties, keySpan);
        this.parseAssignmentEvent(
          identifier, value, srcSpan, attribute.valueSpan, matchableAttributes, boundEvents,
          keySpan);
      } else if (delims.start === BINDING_DELIMS.PROPERTY.start) {
        this.bindingParser.parsePropertyBinding(
          identifier, value, false, srcSpan, absoluteOffset, attribute.valueSpan,
          matchableAttributes, parsedProperties, keySpan);
      } else {
        const events: ParsedEvent[] = [];
        this.bindingParser.parseEvent(
          identifier, value, srcSpan, attribute.valueSpan || srcSpan, matchableAttributes, events,
          keySpan);
        addEvents(events, boundEvents);
      }

      return true;
    }

    // No explicit binding found.
    const keySpan = createKeySpan(srcSpan, '' /* prefix */, name);
    const hasBinding = this.bindingParser.parsePropertyInterpolation(
      name, value, srcSpan, attribute.valueSpan, matchableAttributes, parsedProperties, keySpan);
    return hasBinding;
  }

  private _visitTextWithInterpolation(
    value: string, sourceSpan: ParseSourceSpan): t.Text | t.BoundText {
    const valueNoNgsp = replaceNgsp(value);
    const expr = this.bindingParser.parseInterpolation(valueNoNgsp, sourceSpan);
    return expr ? new t.BoundText(expr, sourceSpan) : new t.Text(valueNoNgsp, sourceSpan);
  }

  private parseVariable(
    identifier: string, value: string, sourceSpan: ParseSourceSpan, keySpan: ParseSourceSpan,
    valueSpan: ParseSourceSpan | undefined, variables: t.Variable[]) {
    if (identifier.indexOf('-') > -1) {
      this.reportError(`"-" is not allowed in variable names`, sourceSpan);
    } else if (identifier.length === 0) {
      this.reportError(`Variable does not have a name`, sourceSpan);
    }

    variables.push(new t.Variable(identifier, value, sourceSpan, keySpan, valueSpan));
  }

  private parseReference(
    identifier: string, value: string, sourceSpan: ParseSourceSpan, keySpan: ParseSourceSpan,
    valueSpan: ParseSourceSpan | undefined, references: t.Reference[]) {
    if (identifier.indexOf('-') > -1) {
      this.reportError(`"-" is not allowed in reference names`, sourceSpan);
    } else if (identifier.length === 0) {
      this.reportError(`Reference does not have a name`, sourceSpan);
    } else if (references.some(reference => reference.name === identifier)) {
      this.reportError(`Reference "#${identifier}" is defined more than once`, sourceSpan);
    }

    references.push(new t.Reference(identifier, value, sourceSpan, keySpan, valueSpan));
  }

  private parseAssignmentEvent(
    name: string, expression: string, sourceSpan: ParseSourceSpan,
    valueSpan: ParseSourceSpan | undefined, targetMatchableAttrs: string[][],
    boundEvents: t.BoundEvent[], keySpan: ParseSourceSpan) {
    const events: ParsedEvent[] = [];
    this.bindingParser.parseEvent(
      `${name}Change`, `${expression}=$event`, sourceSpan, valueSpan || sourceSpan,
      targetMatchableAttrs, events, keySpan);
    addEvents(events, boundEvents);
  }

  private reportError(
    message: string, sourceSpan: ParseSourceSpan,
    level: ParseErrorLevel = ParseErrorLevel.ERROR) {
    this.errors.push(new ParseError(sourceSpan, message, level));
  }
}

class NonBindableVisitor implements html.Visitor {
  visitElement(ast: html.Element): t.Element | null {
    const preparsedElement = preparseElement(ast);
    if (preparsedElement.type === PreparsedElementType.SCRIPT ||
      preparsedElement.type === PreparsedElementType.STYLE ||
      preparsedElement.type === PreparsedElementType.STYLESHEET) {
      // Skipping <script> for security reasons
      // Skipping <style> and stylesheets as we already processed them
      // in the StyleCompiler
      return null;
    }

    const children: t.Node[] = html.visitAll(this, ast.children, null);
    return new t.Element(
      ast.name, html.visitAll(this, ast.attrs) as t.TextAttribute[],
         /* inputs */[], /* outputs */[], children, /* references */[], ast.sourceSpan,
      ast.startSourceSpan, ast.endSourceSpan);
  }

  visitComment(comment: html.Comment): any {
    return null;
  }

  visitAttribute(attribute: html.Attribute): t.TextAttribute {
    return new t.TextAttribute(
      attribute.name, attribute.value, attribute.sourceSpan, attribute.keySpan,
      attribute.valueSpan);
  }

  visitText(text: html.Text): t.Text {
    return new t.Text(text.value, text.sourceSpan);
  }

  visitExpansion(expansion: html.Expansion): any {
    return null;
  }

  visitExpansionCase(expansionCase: html.ExpansionCase): any {
    return null;
  }
}

const NON_BINDABLE_VISITOR = new NonBindableVisitor();

function normalizeAttributeName(attrName: string): string {
  return /^data-/i.test(attrName) ? attrName.substring(5) : attrName;
}

function addEvents(events: ParsedEvent[], boundEvents: t.BoundEvent[]) {
  boundEvents.push(...events.map(e => t.BoundEvent.fromParsedEvent(e)));
}

function isEmptyTextNode(node: html.Node): boolean {
  return node instanceof html.Text && node.value.trim().length == 0;
}

function isCommentNode(node: html.Node): boolean {
  return node instanceof html.Comment;
}

function textContents(node: html.Element): string | null {
  if (node.children.length !== 1 || !(node.children[0] instanceof html.Text)) {
    return null;
  } else {
    return (node.children[0] as html.Text).value;
  }
}
