/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ParseError, ParseSourceSpan } from '../util';

import * as html from './ast';

// http://cldr.unicode.org/index/cldr-spec/plural-rules
const PLURAL_CASES: string[] = ['zero', 'one', 'two', 'few', 'many', 'other'];

/**
 * Expands special forms into elements.
 *
 * For example,
 *
 * ```
 * { messages.length, plural,
 *   =0 {zero}
 *   =1 {one}
 *   other {more than one}
 * }
 * ```
 *
 * will be expanded into
 *
 * ```
 * <v-container [plural]="messages.length">
 *   <v-template pluralCase="=0">zero</v-template>
 *   <v-template pluralCase="=1">one</v-template>
 *   <v-template pluralCase="other">more than one</v-template>
 * </v-container>
 * ```
 */
export function expandNodes(nodes: html.Node[]): ExpansionResult {
    const expander = new _Expander();
    return new ExpansionResult(html.visitAll(expander, nodes), expander.isExpanded, expander.errors);
}

export class ExpansionResult {
    constructor(public nodes: html.Node[], public expanded: boolean, public errors: ParseError[]) { }
}

export class ExpansionError extends ParseError {
    constructor(span: ParseSourceSpan, errorMsg: string) {
        super(span, errorMsg);
    }
}

/**
 * Expand expansion forms (plural, select) to directives
 *
 * @internal
 */
class _Expander implements html.Visitor {
    isExpanded: boolean = false;
    errors: ParseError[] = [];

    visitElement(element: html.Element, context: any): any {
        return new html.Element(
            element.name, element.attrs, html.visitAll(this, element.children), element.sourceSpan,
            element.startSourceSpan, element.endSourceSpan);
    }

    visitAttribute(attribute: html.Attribute, context: any): any {
        return attribute;
    }

    visitText(text: html.Text, context: any): any {
        return text;
    }

    visitComment(comment: html.Comment, context: any): any {
        return comment;
    }

    visitExpansion(icu: html.Expansion, context: any): any {
        this.isExpanded = true;
        return icu.type === 'plural' ? _expandPluralForm(icu, this.errors) :
            _expandDefaultForm(icu, this.errors);
    }

    visitExpansionCase(icuCase: html.ExpansionCase, context: any): any {
        throw new Error('Should not be reached');
    }
}

// Plural forms are expanded to `Plural` and `PluralCase`s
function _expandPluralForm(ast: html.Expansion, errors: ParseError[]): html.Element {
    const children = ast.cases.map(c => {
        if (PLURAL_CASES.indexOf(c.value) === -1 && !c.value.match(/^=\d+$/)) {
            errors.push(new ExpansionError(
                c.valueSourceSpan,
                `Plural cases should be "=<number>" or one of ${PLURAL_CASES.join(', ')}`));
        }

        const expansionResult = expandNodes(c.expression);
        errors.push(...expansionResult.errors);

        return new html.Element(
            `v-template`, [new html.Attribute(
                'pluralCase', `${c.value}`, c.valueSourceSpan, undefined /* keySpan */,
                undefined /* valueSpan */)],
            expansionResult.nodes, c.sourceSpan, c.sourceSpan, c.sourceSpan);
    });
    const switchAttr = new html.Attribute(
        '[plural]', ast.switchValue, ast.switchValueSourceSpan, undefined /* keySpan */,
        undefined /* valueSpan */);
    return new html.Element(
        'v-container', [switchAttr], children, ast.sourceSpan, ast.sourceSpan, ast.sourceSpan);
}

// ICU messages (excluding plural form) are expanded to `NgSwitch`  and `NgSwitchCase`s
function _expandDefaultForm(ast: html.Expansion, errors: ParseError[]): html.Element {
    const children = ast.cases.map(c => {
        const expansionResult = expandNodes(c.expression);
        errors.push(...expansionResult.errors);

        if (c.value === 'other') {
            // other is the default case when no values match
            return new html.Element(
                `v-template`, [new html.Attribute(
                    'switchDefault', '', c.valueSourceSpan, undefined /* keySpan */,
                    undefined /* valueSpan */)],
                expansionResult.nodes, c.sourceSpan, c.sourceSpan, c.sourceSpan);
        }

        return new html.Element(
            `v-template`, [new html.Attribute(
                'switchCase', `${c.value}`, c.valueSourceSpan, undefined /* keySpan */,
                undefined /* valueSpan */)],
            expansionResult.nodes, c.sourceSpan, c.sourceSpan, c.sourceSpan);
    });
    const switchAttr = new html.Attribute(
        '[switch]', ast.switchValue, ast.switchValueSourceSpan, undefined /* keySpan */,
        undefined /* valueSpan */);
    return new html.Element(
        'v-container', [switchAttr], children, ast.sourceSpan, ast.sourceSpan, ast.sourceSpan);
}
