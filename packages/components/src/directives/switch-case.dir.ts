import { Directive } from '../decorators/directive';
import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';
import { Attribute } from '../decorators/atteribute';
import { DirectiveType } from '../refs/directive';
import { RNode } from '../renderer/Node';
import { Host } from '@tsdi/ioc';

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
        chain.defaults.push(defaultDirective);
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
        const chain = getOrCreateSwitchChain(this.parentNode);
        chain.cases.forEach(caseDirective => caseDirective.clearView());
        chain.defaults.forEach(defaultDirective => defaultDirective.clearView());
        chain.cases = [];
        chain.defaults = [];
    }
}

export function registerSwitchDirective(directive: SwitchDirective, parentNode: RNode | null) {
    directive.parentNode = parentNode;
    if (parentNode) {
        const chain = getOrCreateSwitchChain(parentNode);
        chain.switchDirective = directive;
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
        @Host() private _switchDirective: SwitchDirective
    ) {
        this._template = templateRef;
        // 注册到 SwitchDirective
        _switchDirective.registerCase(this);
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
        if (this._switchDirective) {
            this._switchDirective.unregisterCase(this);
        }
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
        @Host() private _switchDirective: SwitchDirective
    ) {
        this._template = templateRef;
        // 注册到 SwitchDirective
        _switchDirective.registerDefault(this);
    }

    @Attribute()
    set context(ctx: any) {
        this._context = ctx;
    }

    @Attribute()
    set template(templateRef: TemplateRef<any>) {
        this._template = templateRef;
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
        if (this._switchDirective) {
            this._switchDirective.unregisterDefault(this);
        }
        this.clearView();
    }
}
