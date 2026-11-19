import { Abstract } from '@tsdi/ioc';
import { CompilerOptions, TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { createTemplateRef } from './template';
import { TemplateFactory } from '../refs/template';
import { RElement, RNode, NodeType } from '../renderer/Node';
import { validateSchemaElement } from '../template/schema';
import {
    applyDirectiveToElement, compileAttributeToFactory, compileComponentToFactory,
    compileElementToFactory, compileTemplateToFactory, compileTextToFactory,
    compileToFactory, generateNodeBindings
} from './compiler-fns';
import { buildVerifiedTemplateIR, getCachedTemplateIR, irToNodes, nodesToIR, sameTemplateIR, setCachedTemplateIR, TemplateIRNode } from './template-ir';

const selectorMatcherCache = new Map<string, RegExp[] | null>();

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Precompute cheap "does this template possibly contain the selector" checks.
 * `generateNodeBindings` otherwise runs a renderer selector query for every
 * registered component/directive, even when the template uses none of them.
 * `null` means "unknown syntax, keep the definition".
 */
function selectorMatchers(selector: string): RegExp[] | null {
    if (selectorMatcherCache.has(selector)) {
        return selectorMatcherCache.get(selector)!;
    }
    const matchers: RegExp[] = [];
    for (const rawPart of selector.split(',')) {
        const part = rawPart.trim();
        if (!part) {
            continue;
        }
        if (part === '*' || part.includes(':')) {
            selectorMatcherCache.set(selector, null);
            return null;
        }
        if (part.startsWith('[') && part.endsWith(']')) {
            const inner = part.slice(1, -1).trim();
            const name = inner.split(/[~|^$*=\s]/)[0];
            if (!name || name === '*') {
                selectorMatcherCache.set(selector, null);
                return null;
            }
            matchers.push(new RegExp(`(?:^|[^A-Za-z0-9_-])${escapeRegExp(name)}(?:[^A-Za-z0-9_-]|$)`, 'i'));
            continue;
        }
        if (part.startsWith('.')) {
            matchers.push(new RegExp(escapeRegExp(part.slice(1)), 'i'));
            continue;
        }
        if (/^[a-zA-Z][\w-]*$/.test(part)) {
            matchers.push(new RegExp(`<\\s*${escapeRegExp(part)}(?:\\s|/|>)`, 'i'));
            continue;
        }
        selectorMatcherCache.set(selector, null);
        return null;
    }
    const result = matchers.length ? matchers : null;
    selectorMatcherCache.set(selector, result);
    return result;
}

function definitionsUsedByTemplate<T extends { selector?: string }>(defs: T[] | undefined, template: string): T[] {
    if (!defs?.length) {
        return defs || [];
    }
    return defs.filter(def => {
        const selector = def.selector;
        if (!selector) {
            return true;
        }
        const matchers = selectorMatchers(selector);
        return !matchers || matchers.some(matcher => matcher.test(template));
    });
}




@Abstract()
export abstract class AbstractTemplateCompiler<T = any> extends TemplateCompiler<T> {

    protected abstract get options(): TemplateCompilerOptions;

    private _delimiter?: RegExp;
    protected get delimiter() {
        if (!this._delimiter) {
            const [open, close] = this.options.delimiters || ['{{', '}}'];
            this._delimiter = new RegExp(`${open}(.*?)${close}`, 'g');
        }
        return this._delimiter;
    }



    /**
     * 编译模板并返回 TemplateFactory
     */
    compile<C>(template: T, options: CompilerOptions): TemplateFactory<C> {
        const templateText = typeof template === 'string' ? template : '';
        let nodes: RNode[] | undefined;
        if (templateText && options.templateIR) {
            try {
                const ir = JSON.parse(options.templateIR) as TemplateIRNode[];
                if (Array.isArray(ir)) {
                    const rebuilt = irToNodes(ir, this.renderer);
                    const roundTrip = nodesToIR(rebuilt, this.renderer);
                    if (roundTrip && sameTemplateIR(ir, roundTrip)) {
                        nodes = rebuilt;
                    }
                }
            } catch {
                // Ignore malformed/incompatible IR and parse the template.
            }
        }
        if (!nodes && this.parser.preferTemplateIR && templateText) {
            const cached = getCachedTemplateIR(this.parser, templateText);
            if (cached === undefined) {
                nodes = this.parser.parse(template);
                setCachedTemplateIR(this.parser, templateText, buildVerifiedTemplateIR(nodes, this.renderer));
            } else if (cached) {
                try {
                    nodes = irToNodes(cached, this.renderer);
                } catch {
                    nodes = this.parser.parse(template);
                    setCachedTemplateIR(this.parser, templateText, null);
                }
            } else {
                nodes = this.parser.parse(template);
            }
        }
        if (!nodes) {
            nodes = this.parser.parse(template);
        }

        if (options.schemas?.length) {
            const declaredElements = new Set(
                [...options.components, ...(options.customElements || [])]
                    .flatMap(def => String(def.selector || '').split(','))
                    .map(selector => selector.trim().toLowerCase())
                    .filter(selector => /^[a-z][\w-]*$/.test(selector))
            );
            const validate = (node: RNode): void => {
                if (node.nodeType === NodeType.Element) {
                    const name = String((node as RElement).tagName || '').toLowerCase();
                    if (name && !declaredElements.has(name)) validateSchemaElement(name, options.schemas!);
                }
                node.childNodes?.forEach(validate);
            };
            nodes.forEach(validate);
        }

        const bindingDirectives = templateText
            ? definitionsUsedByTemplate(options.directives, templateText)
            : options.directives;
        const bindingComponents = templateText
            ? definitionsUsedByTemplate(options.components, templateText)
            : options.components;
        const bindingCustomElements = templateText
            ? definitionsUsedByTemplate(options.customElements, templateText)
            : options.customElements;

        generateNodeBindings<C>(nodes, bindingDirectives, bindingComponents, this.renderer, this.delimiter, undefined, bindingCustomElements);

        // 将模板编译为 node factory
        const factory = compileToFactory<C>(nodes, this.renderer, options, {
            delimiter: this.delimiter,
            templateTag: this.options.templateTag || 'v-template',
            textFactory: compileTextToFactory,
            elementFactory: compileElementToFactory,
            attributeFactory: compileAttributeToFactory,
            componentFactory: compileComponentToFactory,
            templateFactory: compileTemplateToFactory,
            bindDirective: applyDirectiveToElement,
        });

        return (host, injector) => createTemplateRef<C>(factory, host, { injector });
    }


}
