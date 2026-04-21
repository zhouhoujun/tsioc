"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultDirective = exports.CaseDirective = exports.SwitchDirective = void 0;
exports.getSwitchChains = getSwitchChains;
exports.registerSwitchDirective = registerSwitchDirective;
exports.findSwitchDirective = findSwitchDirective;
const tslib_1 = require("tslib");
const directive_1 = require("../decorators/directive");
const template_1 = require("../refs/template");
const container_1 = require("../refs/container");
const atteribute_1 = require("../decorators/atteribute");
const directive_2 = require("../refs/directive");
const ioc_1 = require("@tsdi/ioc");
const switchChains = new WeakMap();
function getSwitchChains() {
    return switchChains;
}
function getOrCreateSwitchChain(parentNode) {
    let chain = switchChains.get(parentNode);
    if (!chain) {
        chain = { switchDirective: null, cases: [], defaults: [], parentNode };
        switchChains.set(parentNode, chain);
    }
    return chain;
}
// Store pending cases/defaults that haven't found their switch yet
const pendingCases = new WeakMap();
const pendingDefaults = new WeakMap();
function addPendingCase(parentNode, caseDirective) {
    let cases = pendingCases.get(parentNode);
    if (!cases) {
        cases = [];
        pendingCases.set(parentNode, cases);
    }
    cases.push(caseDirective);
}
function addPendingDefault(parentNode, defaultDirective) {
    let defaults = pendingDefaults.get(parentNode);
    if (!defaults) {
        defaults = [];
        pendingDefaults.set(parentNode, defaults);
    }
    defaults.push(defaultDirective);
}
function flushPendingCases(parentNode, switchDir) {
    const cases = pendingCases.get(parentNode);
    if (cases) {
        cases.forEach(c => {
            c._switchDirective = switchDir;
            switchDir.registerCase(c);
        });
        pendingCases.delete(parentNode);
    }
}
function flushPendingDefaults(parentNode, switchDir) {
    const defaults = pendingDefaults.get(parentNode);
    if (defaults) {
        defaults.forEach(d => {
            d._switchDirective = switchDir;
            switchDir.registerDefault(d);
        });
        pendingDefaults.delete(parentNode);
    }
}
let SwitchDirective = class SwitchDirective {
    constructor() {
        this.parentNode = null;
    }
    set switch(value) {
        const changed = this._value != value;
        this._value = value;
        if (changed)
            this.updateCases();
    }
    registerCase(caseDirective) {
        const chain = getOrCreateSwitchChain(this.parentNode);
        if (chain.cases.indexOf(caseDirective) === -1) {
            chain.cases.push(caseDirective);
            if (this._value !== undefined) {
                caseDirective.updateView(this._value);
            }
        }
    }
    unregisterCase(caseDirective) {
        if (!this.parentNode)
            return;
        const chain = getOrCreateSwitchChain(this.parentNode);
        const index = chain.cases.indexOf(caseDirective);
        if (index > -1) {
            chain.cases.splice(index, 1);
        }
    }
    registerDefault(defaultDirective) {
        if (!this.parentNode)
            return;
        const chain = getOrCreateSwitchChain(this.parentNode);
        chain.defaults.push(defaultDirective);
        if (this._value !== undefined) {
            this.updateCases();
        }
    }
    unregisterDefault(defaultDirective) {
        if (!this.parentNode)
            return;
        const chain = getOrCreateSwitchChain(this.parentNode);
        const index = chain.defaults.indexOf(defaultDirective);
        if (index > -1) {
            chain.defaults.splice(index, 1);
        }
    }
    updateCases() {
        if (!this.parentNode)
            return;
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
        if (!this.parentNode)
            return;
        const chain = getOrCreateSwitchChain(this.parentNode);
        chain.cases.forEach(caseDirective => caseDirective.clearView());
        chain.defaults.forEach(defaultDirective => defaultDirective.clearView());
        chain.cases = [];
        chain.defaults = [];
    }
};
exports.SwitchDirective = SwitchDirective;
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], SwitchDirective.prototype, "switch", null);
exports.SwitchDirective = SwitchDirective = tslib_1.__decorate([
    (0, directive_1.Directive)({
        selector: '[v-switch],[*switch]',
        priority: 30 // Higher priority than v-case (20) so switch is registered first
    }),
    tslib_1.__metadata("design:paramtypes", [])
], SwitchDirective);
function registerSwitchDirective(directive, parentNode) {
    directive.parentNode = parentNode;
    if (parentNode) {
        const chain = getOrCreateSwitchChain(parentNode);
        chain.switchDirective = directive;
        // Flush any pending cases/defaults that were registered before the switch
        flushPendingCases(parentNode, directive);
        flushPendingDefaults(parentNode, directive);
    }
}
function findSwitchDirective(parentNode) {
    if (!parentNode)
        return null;
    // First check if current node has a switch chain
    let current = parentNode;
    while (current) {
        const chain = switchChains.get(current);
        if (chain?.switchDirective) {
            return chain.switchDirective;
        }
        current = current.parentNode;
    }
    return null;
}
let CaseDirective = class CaseDirective {
    constructor(viewContainer, templateRef, _switchDirective) {
        this.viewContainer = viewContainer;
        this._switchDirective = _switchDirective;
        this._hasView = false;
        this._context = null;
        this._template = templateRef;
        // 注册到 SwitchDirective
        _switchDirective.registerCase(this);
    }
    set context(ctx) {
        this._context = ctx;
    }
    set case(value) {
        this._caseValue = value;
        if (this._switchDirective && this._switchDirective['_value'] !== undefined) {
            this.updateView(this._switchDirective['_value']);
        }
    }
    set template(templateRef) {
        this._template = templateRef;
    }
    updateView(switchValue) {
        const isMatch = this._caseValue === switchValue;
        if (isMatch && !this._hasView) {
            this.createView();
        }
        else if (!isMatch && this._hasView) {
            this.clearView();
        }
        return isMatch;
    }
    createView() {
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
};
exports.CaseDirective = CaseDirective;
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], CaseDirective.prototype, "context", null);
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], CaseDirective.prototype, "case", null);
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", template_1.TemplateRef),
    tslib_1.__metadata("design:paramtypes", [template_1.TemplateRef])
], CaseDirective.prototype, "template", null);
exports.CaseDirective = CaseDirective = tslib_1.__decorate([
    (0, directive_1.Directive)({
        selector: '[v-case],[*case]',
        dirType: directive_2.DirectiveType.Conditional,
        priority: 20
    }),
    tslib_1.__param(2, (0, ioc_1.Host)()),
    tslib_1.__metadata("design:paramtypes", [container_1.ViewContainerRef,
        template_1.TemplateRef,
        SwitchDirective])
], CaseDirective);
let DefaultDirective = class DefaultDirective {
    constructor(viewContainer, templateRef, _switchDirective) {
        this.viewContainer = viewContainer;
        this._switchDirective = _switchDirective;
        this._hasView = false;
        this._context = null;
        this._template = templateRef;
        // 注册到 SwitchDirective
        _switchDirective.registerDefault(this);
    }
    set context(ctx) {
        this._context = ctx;
    }
    set template(templateRef) {
        this._template = templateRef;
    }
    updateView(shouldShow) {
        if (shouldShow && !this._hasView) {
            this.createView();
        }
        else if (!shouldShow && this._hasView) {
            this.clearView();
        }
    }
    createView() {
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
    canShowDefaultView() {
        if (!this._switchDirective)
            return false;
        const chain = switchChains.get(this._switchDirective.parentNode);
        if (!chain)
            return true;
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
};
exports.DefaultDirective = DefaultDirective;
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], DefaultDirective.prototype, "context", null);
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", template_1.TemplateRef),
    tslib_1.__metadata("design:paramtypes", [template_1.TemplateRef])
], DefaultDirective.prototype, "template", null);
exports.DefaultDirective = DefaultDirective = tslib_1.__decorate([
    (0, directive_1.Directive)({
        selector: '[v-default],[*default]',
        dirType: directive_2.DirectiveType.Conditional,
        priority: 20
    }),
    tslib_1.__param(2, (0, ioc_1.Host)()),
    tslib_1.__metadata("design:paramtypes", [container_1.ViewContainerRef,
        template_1.TemplateRef,
        SwitchDirective])
], DefaultDirective);
//# sourceMappingURL=switch-case.dir.js.map