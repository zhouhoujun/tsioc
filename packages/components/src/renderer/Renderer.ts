import { Abstract } from '@tsdi/ioc';
import { NodeType, RAttr, RComment, RElement, RNode, RText } from './Node';
import { noReact } from '../effect';

/**
 * Flags for renderer-specific style modifiers.
 * @publicApi
 */
export enum RendererStyleFlags2 {
  // TODO(misko): This needs to be refactored into a separate file so that it can be imported from
  // `node_manipulation.ts` Currently doing the import cause resolution order to change and fails
  // the tests. The work around is to have hard coded value in `node_manipulation.ts` for now.
  /**
   * Marks a style as important.
   */
  Important = 1 << 0,
  /**
   * Marks a style as using dash case naming (this-is-dash-case).
   */
  DashCase = 1 << 1,
}


@Abstract()
export abstract class Renderer {

  [noReact] = true;

  abstract createComment(value: string): RComment;
  abstract createElement(name: string, namespace?: string | null): RElement;
  abstract createText(value: string): RText;
  /**
   * This property is allowed to be null / undefined,
   * in which case the view engine won't call it.
   * This is used as a performance optimization for production mode.
   */
  abstract destroyNode?: ((node: RNode) => void) | null;

  abstract appendChild(parent: RNode, newChild: RNode): void;
  abstract insertBefore(parent: RNode, newChild: RNode, refChild: RNode | null, isMove?: boolean): void;
  abstract removeChild(parent: RNode | null, oldChild: RNode, isHostElement?: boolean): void;

  /**
  /**
   * ## Supported selectors
   *
   * _As defined by CSS 4 and / or jQuery._
   *
   * - [Type](https://developer.mozilla.org/en-US/docs/Web/CSS/Type_selectors)
   *   (`<tagname>`): Selects elements by their tag name.
   * - [Descendant](https://developer.mozilla.org/en-US/docs/Web/CSS/Descendant_combinator)
   *   (` `): Selects elements that are descendants of the specified element.
   * - [Child](https://developer.mozilla.org/en-US/docs/Web/CSS/Child_combinator)
   *   (`>`): Selects elements that are direct children of the specified element.
   * - Parent (`<`): Selects elements that are direct parents of the specified
   *   element. This follows an
   *   [old proposal](https://shauninman.com/archive/2008/05/05/css_qualified_selectors)
   *   that has been made obsolete by the `:has()` pseudo-class.
   * - [Adjacent sibling](https://developer.mozilla.org/en-US/docs/Web/CSS/Adjacent_sibling_combinator)
   *   (`+`): Selects elements that are the next sibling of the specified element.
   * - [General sibling](https://developer.mozilla.org/en-US/docs/Web/CSS/General_sibling_combinator)
   *   (`~`): Selects elements that are siblings of the specified element.
   * - [Attribute](https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors)
   *   (`[attr=foo]`), with supported comparisons:
   *     - `[attr]` (existential): Selects elements with the specified attribute,
   *       whatever its value.
   *     - `=`: Selects elements with the specified attribute and value.
   *     - `~=`: Selects elements with the specified attribute and value, separated
   *       by spaces.
   *     - `|=`: Selects elements with the specified attribute and value, separated
   *       by hyphens.
   *     - `*=`: Selects elements with the specified attribute and value, anywhere in
   *       the attribute value.
   *     - `^=`: Selects elements with the specified attribute and value, beginning
   *       at the beginning of the attribute value.
   *     - `$=`: Selects elements with the specified attribute and value, ending at
   *       the end of the attribute value.
   *     - `!=`: Selects elements with the specified attribute and value, not equal
   *       to the specified value.
   *     - `i` and `s` can be added after the comparison to make the comparison
   *       case-insensitive or case-sensitive (eg. `[attr=foo i]`). If neither is
   *       supplied, css-select will follow the HTML spec's
   *       [case-sensitivity rules](https://html.spec.whatwg.org/multipage/semantics-other.html#case-sensitivity-of-selectors).
   * - [Selector lists](https://developer.mozilla.org/en-US/docs/Web/CSS/Selector_list)
   *   (`,`): Selects elements that match any of the specified selectors.
   * - [Universal](https://developer.mozilla.org/en-US/docs/Web/CSS/Universal_selectors)
   *   (`*`): Selects all elements.
   * - Pseudos:
   *     - [`:not`](https://developer.mozilla.org/en-US/docs/Web/CSS/:not): Selects
   *       elements that do not match the specified selector.
   *     - [`:contains`](https://api.jquery.com/contains-selector): Selects elements
   *       that contain the specified text.
   *     - `:icontains`: Selects elements that contain the specified text,
   *       case-insensitively.
   *     - [`:has`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has): Selects
   *       elements that have descendants that match the specified selector.
   *     - [`:root`](https://developer.mozilla.org/en-US/docs/Web/CSS/:root): Selects
   *       the root element.
   *     - [`:empty`](https://developer.mozilla.org/en-US/docs/Web/CSS/:empty):
   *       Selects elements that have no children.
   *     - [`:first-child`](https://developer.mozilla.org/en-US/docs/Web/CSS/:first-child):
   *       Selects elements that are the first element child of their parent.
   *     - [`:last-child`](https://developer.mozilla.org/en-US/docs/Web/CSS/:last-child):
   *       Selects elements that are the last element child of their parent.
   *     - [`:first-of-type`](https://developer.mozilla.org/en-US/docs/Web/CSS/:first-of-type):
   *       Selects elements that are the first element of their type.
   *     - [`:last-of-type`](https://developer.mozilla.org/en-US/docs/Web/CSS/:last-of-type):
   *       Selects elements that are the last element of their type.
   *     - [`:only-of-type`](https://developer.mozilla.org/en-US/docs/Web/CSS/:only-of-type):
   *       Selects elements that are the only element of their type.
   *     - [`:only-child`](https://developer.mozilla.org/en-US/docs/Web/CSS/:only-child):
   *       Selects elements that are the only element child of their parent.
   *     - [`:nth-child`](https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-child):
   *       Selects elements that are the nth element child of their parent.
   *     - [`:nth-last-child`](https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-last-child):
   *       Selects elements that are the nth element child of their parent, counting
   *       from the last child.
   *     - [`:nth-of-type`](https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-of-type):
   *       Selects elements that are the nth element of their type.
   *     - [`:nth-last-of-type`](https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-last-of-type):
   *       Selects elements that are the nth element of their type, counting from the
   *       last child.
   *     - [`:any-link`](https://developer.mozilla.org/en-US/docs/Web/CSS/:any-link):
   *       Selects elements that are links.
   *     - [`:link`](https://developer.mozilla.org/en-US/docs/Web/CSS/:link): Selects
   *       elements that are links and have not been visited.
   *     - [`:visited`](https://developer.mozilla.org/en-US/docs/Web/CSS/:visited),
   *       [`:hover`](https://developer.mozilla.org/en-US/docs/Web/CSS/:hover),
   *       [`:active`](https://developer.mozilla.org/en-US/docs/Web/CSS/:active)
   *       (these depend on optional `Adapter` methods, so these will only match
   *       elements if implemented in `Adapter`)
   *     - [`:checked`](https://developer.mozilla.org/en-US/docs/Web/CSS/:checked):
   *       Selects `input` elements that are checked, or `option` elements that are
   *       selected.
   *     - [`:disabled`](https://developer.mozilla.org/en-US/docs/Web/CSS/:disabled):
   *       Selects input elements that are disabled.
   *     - [`:enabled`](https://developer.mozilla.org/en-US/docs/Web/CSS/:enabled):
   *       Selects input elements that are not disabled.
   *     - [`:required`](https://developer.mozilla.org/en-US/docs/Web/CSS/:required):
   *       Selects input elements that are required.
   *     - [`:optional`](https://developer.mozilla.org/en-US/docs/Web/CSS/:optional):
   *       Selects input elements that are not required.
   *     - jQuery extensions:
   *         - [`:parent`](https://api.jquery.com/parent-selector): Selects elements
   *           that have at least one child.
   *         - [`:header`](https://api.jquery.com/header-selector): Selects header
   *           elements.
   *         - [`:selected`](https://api.jquery.com/selected-selector): Selects
   *           `option` elements that are selected.
   *         - [`:button`](https://api.jquery.com/button-selector): Selects button
   *           elements, and `input` elements of type `button`.
   *         - [`:input`](https://api.jquery.com/input-selector): Selects `input`,
   *           `textarea`, `select`, and `button` elements.
   *         - [`:text`](https://api.jquery.com/text-selector): Selects `input`
   *           elements of type `text`.
   *         - [`:checkbox`](https://api.jquery.com/checkbox-selector): Selects
   *           `input` elements of type `checkbox`.
   *         - [`:file`](https://api.jquery.com/file-selector): Selects `input`
   *           elements of type `file`.
   *         - [`:password`](https://api.jquery.com/password-selector): Selects
   *           `input` elements of type `password`.
   *         - [`:reset`](https://api.jquery.com/reset-selector): Selects `input`
   *           elements of type `reset`.
   *         - [`:radio`](https://api.jquery.com/radio-selector): Selects `input`
   *           elements of type `radio`.
   *     - [`:is`](https://developer.mozilla.org/en-US/docs/Web/CSS/:is), as well as
   *       the aliases
   *       [`:where`](https://developer.mozilla.org/en-US/docs/Web/CSS/:where), and
   *       the legacy alias `:matches`: Selects elements that match any of the given
   *       selectors.
   *     - [`:scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/:scope):
   *       Selects elements that are part of the scope of the current selector. This
   *       uses the context from the passed options.
   *
   * @param el 
   * @param selector 
   */
  abstract querySelector(el: RNode | RNode[], selector: string): RNode | null;
  /**
  /**
   * ## Supported selectors
   *
   * _As defined by CSS 4 and / or jQuery._
   *
   * - [Type](https://developer.mozilla.org/en-US/docs/Web/CSS/Type_selectors)
   *   (`<tagname>`): Selects elements by their tag name.
   * - [Descendant](https://developer.mozilla.org/en-US/docs/Web/CSS/Descendant_combinator)
   *   (` `): Selects elements that are descendants of the specified element.
   * - [Child](https://developer.mozilla.org/en-US/docs/Web/CSS/Child_combinator)
   *   (`>`): Selects elements that are direct children of the specified element.
   * - Parent (`<`): Selects elements that are direct parents of the specified
   *   element. This follows an
   *   [old proposal](https://shauninman.com/archive/2008/05/05/css_qualified_selectors)
   *   that has been made obsolete by the `:has()` pseudo-class.
   * - [Adjacent sibling](https://developer.mozilla.org/en-US/docs/Web/CSS/Adjacent_sibling_combinator)
   *   (`+`): Selects elements that are the next sibling of the specified element.
   * - [General sibling](https://developer.mozilla.org/en-US/docs/Web/CSS/General_sibling_combinator)
   *   (`~`): Selects elements that are siblings of the specified element.
   * - [Attribute](https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors)
   *   (`[attr=foo]`), with supported comparisons:
   *     - `[attr]` (existential): Selects elements with the specified attribute,
   *       whatever its value.
   *     - `=`: Selects elements with the specified attribute and value.
   *     - `~=`: Selects elements with the specified attribute and value, separated
   *       by spaces.
   *     - `|=`: Selects elements with the specified attribute and value, separated
   *       by hyphens.
   *     - `*=`: Selects elements with the specified attribute and value, anywhere in
   *       the attribute value.
   *     - `^=`: Selects elements with the specified attribute and value, beginning
   *       at the beginning of the attribute value.
   *     - `$=`: Selects elements with the specified attribute and value, ending at
   *       the end of the attribute value.
   *     - `!=`: Selects elements with the specified attribute and value, not equal
   *       to the specified value.
   *     - `i` and `s` can be added after the comparison to make the comparison
   *       case-insensitive or case-sensitive (eg. `[attr=foo i]`). If neither is
   *       supplied, css-select will follow the HTML spec's
   *       [case-sensitivity rules](https://html.spec.whatwg.org/multipage/semantics-other.html#case-sensitivity-of-selectors).
   * - [Selector lists](https://developer.mozilla.org/en-US/docs/Web/CSS/Selector_list)
   *   (`,`): Selects elements that match any of the specified selectors.
   * - [Universal](https://developer.mozilla.org/en-US/docs/Web/CSS/Universal_selectors)
   *   (`*`): Selects all elements.
   * - Pseudos:
   *     - [`:not`](https://developer.mozilla.org/en-US/docs/Web/CSS/:not): Selects
   *       elements that do not match the specified selector.
   *     - [`:contains`](https://api.jquery.com/contains-selector): Selects elements
   *       that contain the specified text.
   *     - `:icontains`: Selects elements that contain the specified text,
   *       case-insensitively.
   *     - [`:has`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has): Selects
   *       elements that have descendants that match the specified selector.
   *     - [`:root`](https://developer.mozilla.org/en-US/docs/Web/CSS/:root): Selects
   *       the root element.
   *     - [`:empty`](https://developer.mozilla.org/en-US/docs/Web/CSS/:empty):
   *       Selects elements that have no children.
   *     - [`:first-child`](https://developer.mozilla.org/en-US/docs/Web/CSS/:first-child):
   *       Selects elements that are the first element child of their parent.
   *     - [`:last-child`](https://developer.mozilla.org/en-US/docs/Web/CSS/:last-child):
   *       Selects elements that are the last element child of their parent.
   *     - [`:first-of-type`](https://developer.mozilla.org/en-US/docs/Web/CSS/:first-of-type):
   *       Selects elements that are the first element of their type.
   *     - [`:last-of-type`](https://developer.mozilla.org/en-US/docs/Web/CSS/:last-of-type):
   *       Selects elements that are the last element of their type.
   *     - [`:only-of-type`](https://developer.mozilla.org/en-US/docs/Web/CSS/:only-of-type):
   *       Selects elements that are the only element of their type.
   *     - [`:only-child`](https://developer.mozilla.org/en-US/docs/Web/CSS/:only-child):
   *       Selects elements that are the only element child of their parent.
   *     - [`:nth-child`](https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-child):
   *       Selects elements that are the nth element child of their parent.
   *     - [`:nth-last-child`](https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-last-child):
   *       Selects elements that are the nth element child of their parent, counting
   *       from the last child.
   *     - [`:nth-of-type`](https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-of-type):
   *       Selects elements that are the nth element of their type.
   *     - [`:nth-last-of-type`](https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-last-of-type):
   *       Selects elements that are the nth element of their type, counting from the
   *       last child.
   *     - [`:any-link`](https://developer.mozilla.org/en-US/docs/Web/CSS/:any-link):
   *       Selects elements that are links.
   *     - [`:link`](https://developer.mozilla.org/en-US/docs/Web/CSS/:link): Selects
   *       elements that are links and have not been visited.
   *     - [`:visited`](https://developer.mozilla.org/en-US/docs/Web/CSS/:visited),
   *       [`:hover`](https://developer.mozilla.org/en-US/docs/Web/CSS/:hover),
   *       [`:active`](https://developer.mozilla.org/en-US/docs/Web/CSS/:active)
   *       (these depend on optional `Adapter` methods, so these will only match
   *       elements if implemented in `Adapter`)
   *     - [`:checked`](https://developer.mozilla.org/en-US/docs/Web/CSS/:checked):
   *       Selects `input` elements that are checked, or `option` elements that are
   *       selected.
   *     - [`:disabled`](https://developer.mozilla.org/en-US/docs/Web/CSS/:disabled):
   *       Selects input elements that are disabled.
   *     - [`:enabled`](https://developer.mozilla.org/en-US/docs/Web/CSS/:enabled):
   *       Selects input elements that are not disabled.
   *     - [`:required`](https://developer.mozilla.org/en-US/docs/Web/CSS/:required):
   *       Selects input elements that are required.
   *     - [`:optional`](https://developer.mozilla.org/en-US/docs/Web/CSS/:optional):
   *       Selects input elements that are not required.
   *     - jQuery extensions:
   *         - [`:parent`](https://api.jquery.com/parent-selector): Selects elements
   *           that have at least one child.
   *         - [`:header`](https://api.jquery.com/header-selector): Selects header
   *           elements.
   *         - [`:selected`](https://api.jquery.com/selected-selector): Selects
   *           `option` elements that are selected.
   *         - [`:button`](https://api.jquery.com/button-selector): Selects button
   *           elements, and `input` elements of type `button`.
   *         - [`:input`](https://api.jquery.com/input-selector): Selects `input`,
   *           `textarea`, `select`, and `button` elements.
   *         - [`:text`](https://api.jquery.com/text-selector): Selects `input`
   *           elements of type `text`.
   *         - [`:checkbox`](https://api.jquery.com/checkbox-selector): Selects
   *           `input` elements of type `checkbox`.
   *         - [`:file`](https://api.jquery.com/file-selector): Selects `input`
   *           elements of type `file`.
   *         - [`:password`](https://api.jquery.com/password-selector): Selects
   *           `input` elements of type `password`.
   *         - [`:reset`](https://api.jquery.com/reset-selector): Selects `input`
   *           elements of type `reset`.
   *         - [`:radio`](https://api.jquery.com/radio-selector): Selects `input`
   *           elements of type `radio`.
   *     - [`:is`](https://developer.mozilla.org/en-US/docs/Web/CSS/:is), as well as
   *       the aliases
   *       [`:where`](https://developer.mozilla.org/en-US/docs/Web/CSS/:where), and
   *       the legacy alias `:matches`: Selects elements that match any of the given
   *       selectors.
   *     - [`:scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/:scope):
   *       Selects elements that are part of the scope of the current selector. This
   *       uses the context from the passed options.
   *
   * @param el 
   * @param selector 
   */
  abstract querySelectorAll(el: RNode | RNode[], selector: string): RNode[] | null;

  abstract parentNode(node: RNode): RNode | null;
  abstract nextSibling(node: RNode): RNode | null;

  abstract setAttribute(
    el: RNode,
    name: string,
    value: string,
    namespace?: string | null,
  ): void;
  abstract removeAttribute(el: RNode, name: string, namespace?: string | null): void;

  abstract getAttributes(el: RNode): RAttr[];

  abstract addClass(el: RElement, name: string): void;
  abstract removeClass(el: RElement, name: string): void;
  abstract setStyle(el: RElement, style: string, value: any, flags?: RendererStyleFlags2): void;
  abstract removeStyle(el: RElement, style: string, flags?: RendererStyleFlags2): void;
  abstract setProperty(el: RElement, name: string, value: any): void;
  abstract setValue(node: RText | RComment, value: string): void;
}