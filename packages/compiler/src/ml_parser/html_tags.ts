/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {TagContentType, TagDefinition} from './tags';

export class HtmlTagDefinition implements TagDefinition {
  private closedByChildren: {[key: string]: boolean} = {};

  closedByParent: boolean = false;
  implicitNamespacePrefix: string|null;
  contentType: TagContentType;
  isVoid: boolean;
  ignoreFirstLf: boolean;
  canSelfClose: boolean = false;

  constructor(
      {closedByChildren, implicitNamespacePrefix, contentType = TagContentType.PARSABLE_DATA,
       closedByParent = false, isVoid = false, ignoreFirstLf = false}: {
        closedByChildren?: string[],
        closedByParent?: boolean,
        implicitNamespacePrefix?: string,
        contentType?: TagContentType,
        isVoid?: boolean,
        ignoreFirstLf?: boolean
      } = {}) {
    if (closedByChildren && closedByChildren.length > 0) {
      closedByChildren.forEach(tagName => this.closedByChildren[tagName] = true);
    }
    this.isVoid = isVoid;
    this.closedByParent = closedByParent || isVoid;
    this.implicitNamespacePrefix = implicitNamespacePrefix || null;
    this.contentType = contentType;
    this.ignoreFirstLf = ignoreFirstLf;
  }

  isClosedByChild(name: string): boolean {
    return this.isVoid || name.toLowerCase() in this.closedByChildren;
  }
}

let _DEFAULT_TAG_DEFINITION !: HtmlTagDefinition;

// see http://www.w3.org/TR/html51/syntax.html#optional-tags
// This implementation does not fully conform to the HTML5 spec.
let TAG_DEFINITIONS !: {[key: string]: HtmlTagDefinition};

export function getHtmlTagDefinition(tagName: string): HtmlTagDefinition {
  if (!TAG_DEFINITIONS) {
    _DEFAULT_TAG_DEFINITION = new HtmlTagDefinition();
    TAG_DEFINITIONS = {
      'base': new HtmlTagDefinition({isVoid: true}),
      'meta': new HtmlTagDefinition({isVoid: true}),
      'area': new HtmlTagDefinition({isVoid: true}),
      'embed': new HtmlTagDefinition({isVoid: true}),
      'link': new HtmlTagDefinition({isVoid: true}),
      'img': new HtmlTagDefinition({isVoid: true}),
      'input': new HtmlTagDefinition({isVoid: true}),
      'param': new HtmlTagDefinition({isVoid: true}),
      'hr': new HtmlTagDefinition({isVoid: true}),
      'br': new HtmlTagDefinition({isVoid: true}),
      'source': new HtmlTagDefinition({isVoid: true}),
      'track': new HtmlTagDefinition({isVoid: true}),
      'wbr': new HtmlTagDefinition({isVoid: true}),
      'p': new HtmlTagDefinition({
        closedByChildren: [
          'address', 'article', 'aside',   'blockquote', 'div',  'dl',  'fieldset',
          'footer',  'form',    'h1',      'h2',         'h3',   'h4',  'h5',
          'h6',      'header',  'hgroup',  'hr',         'main', 'nav', 'ol',
          'p',       'pre',     'section', 'table',      'ul'
        ],
        closedByParent: true
      }),
      'thead': new HtmlTagDefinition({closedByChildren: ['tbody', 'tfoot']}),
      'tbody': new HtmlTagDefinition({closedByChildren: ['tbody', 'tfoot'], closedByParent: true}),
      'tfoot': new HtmlTagDefinition({closedByChildren: ['tbody'], closedByParent: true}),
      'tr': new HtmlTagDefinition({closedByChildren: ['tr'], closedByParent: true}),
      'td': new HtmlTagDefinition({closedByChildren: ['td', 'th'], closedByParent: true}),
      'th': new HtmlTagDefinition({closedByChildren: ['td', 'th'], closedByParent: true}),
      'col': new HtmlTagDefinition({isVoid: true}),
      'svg': new HtmlTagDefinition({implicitNamespacePrefix: 'svg'}),
      'math': new HtmlTagDefinition({implicitNamespacePrefix: 'math'}),
      'li': new HtmlTagDefinition({closedByChildren: ['li'], closedByParent: true}),
      'dt': new HtmlTagDefinition({closedByChildren: ['dt', 'dd']}),
      'dd': new HtmlTagDefinition({closedByChildren: ['dt', 'dd'], closedByParent: true}),
      'rb': new HtmlTagDefinition(
          {closedByChildren: ['rb', 'rt', 'rtc', 'rp'], closedByParent: true}),
      'rt': new HtmlTagDefinition(
          {closedByChildren: ['rb', 'rt', 'rtc', 'rp'], closedByParent: true}),
      'rtc': new HtmlTagDefinition({closedByChildren: ['rb', 'rtc', 'rp'], closedByParent: true}),
      'rp': new HtmlTagDefinition(
          {closedByChildren: ['rb', 'rt', 'rtc', 'rp'], closedByParent: true}),
      'optgroup': new HtmlTagDefinition({closedByChildren: ['optgroup'], closedByParent: true}),
      'option':
          new HtmlTagDefinition({closedByChildren: ['option', 'optgroup'], closedByParent: true}),
      'pre': new HtmlTagDefinition({ignoreFirstLf: true}),
      'listing': new HtmlTagDefinition({ignoreFirstLf: true}),
      'style': new HtmlTagDefinition({contentType: TagContentType.RAW_TEXT}),
      'script': new HtmlTagDefinition({contentType: TagContentType.RAW_TEXT}),
      'title': new HtmlTagDefinition({contentType: TagContentType.ESCAPABLE_RAW_TEXT}),
      'textarea': new HtmlTagDefinition(
          {contentType: TagContentType.ESCAPABLE_RAW_TEXT, ignoreFirstLf: true}),
    };
  }
  return TAG_DEFINITIONS[tagName.toLowerCase()] || _DEFAULT_TAG_DEFINITION;
}
