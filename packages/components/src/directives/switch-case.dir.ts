import { Directive } from '../decorators/directive';
import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';
import { Attribute } from '../decorators/atteribute';
import { DirectiveType } from '../refs/directive';
import { RNode } from '../renderer/Node';
import { Host, Optional } from '@tsdi/ioc';

interface SwitchChain {
    switchDirective: SwitchDirective;
    cases: CaseDirective[];
    defaults: DefaultDirective[];
    parentNode: RNode;
}

const switchChains = new WeakMap<RNode, SwitchChain>();

export function getSwitchChains(): WeakMap<RNode, SwitchChain> {
    return switchChains;
}

function getOrCreateSwitchChain(parentNode: RNode): SwitchChain {
    let chain = switchChains.get(parentNode);
    if (!chain) {
        chain = { switchDirective: null!, cases: [], defaults: [], parentNode };
        switchChains.set(parentNode, chain);
    }
    return chain;
}

// Store pending cases/defaults that haven't found their switch yet
const pendingCases = new WeakMap<RNode, CaseDirective[]>();
const pendingDefaults = new WeakMap<RNode, DefaultDirective[]>();

function addPendingCase(parentNode: RNode, caseDirective: CaseDirective) {
    let cases = pendingCases.get(parentNode);
    if (!cases) {
        cases = [];
        pendingCases.set(parentNode, cases);
    }
    cases.push(caseDirective);
}

function addPendingDefault(parentNode: RNode, defaultDirective: DefaultDirective) {
    let defaults = pendingDefaults.get(parentNode);
    if (!defaults) {
        defaults = [];
        pendingDefaults.set(parentNode, defaults);
    }
    defaults.push(defaultDirective);
}

function flushPendingCases(parentNode: RNode, switchDir: SwitchDirective) {
    const cases = pendingCases.get(parentNode);
    if (cases) {
        cases.forEach(c => {
            (c as any)._switchDirective = switchDir;
            switchDir.registerCase(c);
        });
        pendingCases.delete(parentNode);
    }
}

function flushPendingDefaults(parentNode: RNode, switchDir: SwitchDirective) {
    const defaults = pendingDefaults.get(parentNode);
    if (defaults) {
        defaults.forEach(d => {
            (d as any)._switchDirective = switchDir;
            switchDir.registerDefault(d);
        });
        pendingDefaults.delete(parentNode);
    }
}

function getSwitchLookupNode(directive: { parentNode?: RNode | null; _switchLookupNode?: RNode | null; }): RNode | null {
    return directive._switchLookupNode ?? directive.parentNode ?? null;
}

function clearPendingCase(parentNode: RNode | null, caseDirective: CaseDirective) {
    if (!parentNode) return;
    const cases = pendingCases.get(parentNode);
    if (!cases) return;
    const index = cases.indexOf(caseDirective);
    if (index > -1) {
        cases.splice(index, 1);
    }
    if (!cases.length) {
        pendingCases.delete(parentNode);
    }
}

function clearPendingDefault(parentNode: RNode | null, defaultDirective: DefaultDirective) {
    if (!parentNode) return;
    const defaults = pendingDefaults.get(parentNode);
    if (!defaults) return;
    const index = defaults.indexOf(defaultDirective);
    if (index > -1) {
        defaults.splice(index, 1);
    }
    if (!defaults.length) {
        pendingDefaults.delete(parentNode);
    }
}

@Directive({
    selector: '[v-switch],[*switch]',
    priority: 30  // Higher priority than v-case (20) so switch is registered first
})
export class SwitchDirective {
    private _value: any;
    public parentNode: RNode | null = null;

    constructor() { }

    @Attribute()
    set switch(value: any) {
        const changed = this._value != value;
        this._value = value;
        if (changed) this.updateCases();
    }

    registerCase(caseDirective: CaseDirective) {
        const chain = getOrCreateSwitchChain(this.parentNode!);
        if (chain.cases.indexOf(caseDirective) === -1) {
            chain.cases.push(caseDirective);
            if (this._value !== undefined) {
                caseDirective.updateView(this._value);
            }
        }
    }

    unregisterCase(caseDirective: CaseDirective) {
        if (!this.parentNode) return;
        const chain = getOrCreateSwitchChain(this.parentNode);
        const index = chain.cases.indexOf(caseDirective);
        if (index > -1) {
            chain.cases.splice(index, 1);
        }
    }

    registerDefault(defaultDirective: DefaultDirective) {
        if (!this.parentNode) return;
        const chain = getOrCreateSwitchChain(this.parentNode);
        if (chain.defaults.indexOf(defaultDirective) === -1) {
            chain.defaults.push(defaultDirective);
        }
        if (this._value !== undefined) {
            this.updateCases();
        }
    }

    unregisterDefault(defaultDirective: DefaultDirective) {
        if (!this.parentNode) return;
        const chain = getOrCreateSwitchChain(this.parentNode);
        const index = chain.defaults.indexOf(defaultDirective);
        if (index > -1) {
            chain.defaults.splice(index, 1);
        }
    }

    private updateCases() {
        if (!this.parentNode) return;
        let matchFound = false;

        for (const caseDirective of getOrCreateSwitchChain(this.parentNode).cases) {
            const matched = caseDirective.updateView(this._value);
            if (matched) {
                matchFound = true;
            }
        }

        for (const defaultDirective of getOrCreateSwitchChain(this.parentNode).defaults) {
            defaultDirective.updateView(!matchFound);
        }
    }

    onInit() {
        // Flush any pending cases/defaults that were registered before the switch
        if (this.parentNode) {
            flushPendingCases(this.parentNode, this);
            flushPendingDefaults(this.parentNode, this);
        }

        if (this._value !== undefined) {
            this.updateCases();
        }
    }

    onDestroy() {
        if (!this.parentNode) return;
        const chain = switchChains.get(this.parentNode);
        if (!chain || chain.switchDirective !== this) {
            return;
        }
        chain.cases.forEach(caseDirective => caseDirective.clearView());
        chain.defaults.forEach(defaultDirective => defaultDirective.clearView());
        chain.cases = [];
        chain.defaults = [];
        chain.switchDirective = null as any;
    }
}

export function registerSwitchDirective(directive: SwitchDirective, parentNode: RNode | null) {
    directive.parentNode = parentNode;
    if (parentNode) {
        const chain = getOrCreateSwitchChain(parentNode);
        const existingCases = chain.cases.slice();
        const existingDefaults = chain.defaults.slice();
        if (chain.switchDirective && chain.switchDirective !== directive) {
            existingCases.forEach(caseDirective => caseDirective.clearView());
            existingDefaults.forEach(defaultDirective => defaultDirective.clearView());
        }
        chain.cases = [];
        chain.defaults = [];
        chain.switchDirective = directive;
        existingCases.forEach(caseDirective => {
            (caseDirective as any)._switchDirective = directive;
            directive.registerCase(caseDirective);
        });
        existingDefaults.forEach(defaultDirective => {
            (defaultDirective as any)._switchDirective = directive;
            directive.registerDefault(defaultDirective);
        });
        // Flush any pending cases/defaults that were registered before the switch
        flushPendingCases(parentNode, directive);
        flushPendingDefaults(parentNode, directive);
    }
}

export function findSwitchDirective(parentNode: RNode | null): SwitchDirective | null {
    if (!parentNode) return null;

    // First check if current node has a switch chain
    let current: RNode | null = parentNode;
    while (current) {
        const chain = switchChains.get(current);
        if (chain?.switchDirective) {
            return chain.switchDirective;
        }
        current = current.parentNode;
    }

    return null;
}

@Directive({
    selector: '[v-case],[*case]',
    dirType: DirectiveType.Conditional,    
    priority: 20
})
export class CaseDirective {
    private _hasView = false;
    private _context: any = null;
    private _caseValue: any;
    private _template: TemplateRef<any>;

    constructor(
        private viewContainer: ViewContainerRef,
        templateRef: TemplateRef<any>,
        @Optional() @Host() private _switchDirective?: SwitchDirective | null
    ) {
        this._template = templateRef;
    }

    @Attribute()
    set context(ctx: any) {
        this._context = ctx;
    }

    @Attribute()
    set case(value: any) {
        this._caseValue = value;
        if (this._switchDirective && this._switchDirective['_value'] !== undefined) {
            this.updateView(this._switchDirective['_value']);
        }
    }

    @Attribute()
    set template(templateRef: TemplateRef<any>) {
        this._template = templateRef;
    }

    onInit() {
        const lookupNode = getSwitchLookupNode(this as any);
        const resolvedSwitch = findSwitchDirective(lookupNode);
        if (resolvedSwitch) {
            this.bindToSwitch(resolvedSwitch);
            if (this._switchDirective && this._switchDirective['_value'] !== undefined) {
                this.updateView(this._switchDirective['_value']);
            }
            return;
        }

        clearPendingCase(lookupNode, this);
        if (lookupNode) {
            addPendingCase(lookupNode, this);
        }
        if (this._switchDirective) {
            this._switchDirective.unregisterCase(this);
            this._switchDirective = null;
        }
    }

    private bindToSwitch(nextSwitch: SwitchDirective) {
        if (this._switchDirective === nextSwitch) {
            return;
        }
        if (this._switchDirective && typeof this._switchDirective.unregisterCase === 'function') {
            this._switchDirective.unregisterCase(this);
        }
        this._switchDirective = nextSwitch;
        nextSwitch.registerCase(this);
    }

    updateView(switchValue: any): boolean {
        const isMatch = this._caseValue === switchValue;
        if (isMatch && !this._hasView) {
            this.createView();
        } else if (!isMatch && this._hasView) {
            this.clearView();
        }
        return isMatch;
    }

    private createView() {
        if (!this._template) {
            return;
        }
        this.viewContainer.createEmbeddedView(this._template, this._context);
        this._hasView = true;
    }

    clearView() {
        this.viewContainer.clear();
        this._hasView = false;
    }

    onDestroy() {
        if (this._switchDirective && typeof this._switchDirective.unregisterCase === 'function') {
            this._switchDirective.unregisterCase(this);
        }
        clearPendingCase(getSwitchLookupNode(this as any), this);
        this.clearView();
    }
}

@Directive({
    selector: '[v-default],[*default]',
    dirType: DirectiveType.Conditional,
    priority: 20
})
export class DefaultDirective {
    private _hasView = false;
    private _context: any = null;
    private _template: TemplateRef<any>;

    constructor(
        private viewContainer: ViewContainerRef,
        templateRef: TemplateRef<any>,
        @Optional() @Host() private _switchDirective?: SwitchDirective | null
    ) {
        this._template = templateRef;
    }

    @Attribute()
    set context(ctx: any) {
        this._context = ctx;
    }

    @Attribute()
    set template(templateRef: TemplateRef<any>) {
        this._template = templateRef;
    }

    onInit() {
        const lookupNode = getSwitchLookupNode(this as any);
        const resolvedSwitch = findSwitchDirective(lookupNode);
        if (resolvedSwitch) {
            this.bindToSwitch(resolvedSwitch);
            return;
        }

        clearPendingDefault(lookupNode, this);
        if (lookupNode) {
            addPendingDefault(lookupNode, this);
        }
        if (this._switchDirective) {
            this._switchDirective.unregisterDefault(this);
            this._switchDirective = null;
        }
    }

    private bindToSwitch(nextSwitch: SwitchDirective) {
        if (this._switchDirective === nextSwitch) {
            return;
        }
        if (this._switchDirective && typeof this._switchDirective.unregisterDefault === 'function') {
            this._switchDirective.unregisterDefault(this);
        }
        this._switchDirective = nextSwitch;
        nextSwitch.registerDefault(this);
    }

    updateView(shouldShow: boolean) {
        if (shouldShow && !this._hasView) {
            this.createView();
        } else if (!shouldShow && this._hasView) {
            this.clearView();
        }
    }

    private createView() {
        if (!this._template) {
            return;
        }
        this.viewContainer.createEmbeddedView(this._template, this._context);
        this._hasView = true;
    }

    clearView() {
        this.viewContainer.clear();
        this._hasView = false;
    }

    private canShowDefaultView(): boolean {
        if (!this._switchDirective) return false;
        const chain = switchChains.get(this._switchDirective.parentNode!);
        if (!chain) return true;
        for (const c of chain.cases) {
            if (c['_caseValue'] === this._switchDirective['_value']) {
                return false;
            }
        }
        return true;
    }

    onDestroy() {
        if (this._switchDirective && typeof this._switchDirective.unregisterDefault === 'function') {
            this._switchDirective.unregisterDefault(this);
        }
        clearPendingDefault(getSwitchLookupNode(this as any), this);
        this.clearView();
    }
}
