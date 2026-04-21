"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VElseDirective = exports.VElseIfDirective = exports.VIfDirective = exports.BaseIfDirective = void 0;
exports.setupIfChain = setupIfChain;
const tslib_1 = require("tslib");
const directive_1 = require("../decorators/directive");
const template_1 = require("../refs/template");
const container_1 = require("../refs/container");
const atteribute_1 = require("../decorators/atteribute");
const directive_2 = require("../refs/directive");
const ifChains = new WeakMap();
function getOrCreateIfChain(parentNode) {
    let chain = ifChains.get(parentNode);
    if (!chain) {
        chain = { root: null, siblings: [], parentNode };
        ifChains.set(parentNode, chain);
    }
    return chain;
}
function registerToIfChain(directive, parentNode) {
    if (!parentNode)
        return null;
    const chain = getOrCreateIfChain(parentNode);
    if (!chain.root) {
        chain.root = directive;
        return null;
    }
    const lastSibling = chain.siblings.length > 0
        ? chain.siblings[chain.siblings.length - 1]
        : chain.root;
    directive._rootDirective = chain.root;
    directive._prevDirective = lastSibling;
    lastSibling._nextDirective = directive;
    chain.siblings.push(directive);
    return chain.root;
}
class BaseIfDirective {
    constructor(viewContainer, templateRef) {
        this.viewContainer = viewContainer;
        this._hasView = false;
        this._context = null;
        this._rootDirective = null;
        this._prevDirective = null;
        this._nextDirective = null;
        this._templateRef = templateRef;
    }
    set context(ctx) {
        const changed = this._context !== ctx;
        this._context = ctx;
        if (changed)
            this.updateView();
    }
    set template(templateRef) {
        const changed = this._templateRef !== templateRef;
        this._templateRef = templateRef;
        if (changed)
            this.updateView();
    }
    createView() {
        if (!this._templateRef) {
            console.warn('BaseIfDirective: templateRef is not set');
            return;
        }
        this.viewContainer.createEmbeddedView(this._templateRef, this._context);
        this._hasView = true;
    }
    clearView() {
        this.viewContainer.clear();
        this._hasView = false;
    }
    updateView() {
        this.clearAllViews();
        if (this.shouldShow()) {
            this.createView();
        }
        else {
            this.checkNextSibling();
        }
    }
    clearAllViews() {
        if (this._hasView) {
            this.clearView();
        }
        let next = this._nextDirective;
        while (next) {
            if (next._hasView) {
                next.clearView();
            }
            next = next._nextDirective;
        }
    }
    checkNextSibling() {
        let next = this._nextDirective;
        while (next) {
            if (next.shouldShow()) {
                next.createView();
                return;
            }
            next = next._nextDirective;
        }
    }
    shouldShow() {
        return false;
    }
    onInit() {
        this.updateView();
    }
    onDestroy() {
        this.clearView();
        if (this._prevDirective) {
            this._prevDirective._nextDirective = this._nextDirective;
        }
        if (this._nextDirective) {
            this._nextDirective._prevDirective = this._prevDirective;
        }
    }
}
exports.BaseIfDirective = BaseIfDirective;
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], BaseIfDirective.prototype, "context", null);
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", template_1.TemplateRef),
    tslib_1.__metadata("design:paramtypes", [template_1.TemplateRef])
], BaseIfDirective.prototype, "template", null);
let VIfDirective = class VIfDirective extends BaseIfDirective {
    constructor(viewContainer, templateRef) {
        super(viewContainer, templateRef);
        this._condition = false;
        this.parentNode = null;
    }
    set if(condition) {
        const changed = this._condition !== condition;
        this._condition = condition;
        if (changed) {
            this.updateView();
        }
    }
    shouldShow() {
        return this._condition;
    }
};
exports.VIfDirective = VIfDirective;
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", Boolean),
    tslib_1.__metadata("design:paramtypes", [Boolean])
], VIfDirective.prototype, "if", null);
exports.VIfDirective = VIfDirective = tslib_1.__decorate([
    (0, directive_1.Directive)({
        selector: '[v-if],[*if]',
        dirType: directive_2.DirectiveType.Conditional,
        priority: 10
    }),
    tslib_1.__metadata("design:paramtypes", [container_1.ViewContainerRef,
        template_1.TemplateRef])
], VIfDirective);
let VElseIfDirective = class VElseIfDirective extends BaseIfDirective {
    constructor(viewContainer, templateRef) {
        super(viewContainer, templateRef);
    }
    set elseIf(condition) {
        const changed = this._condition !== condition;
        this._condition = condition;
        if (changed) {
            this.updateView();
        }
    }
    shouldShow() {
        if (this._condition !== true)
            return false;
        const root = this._rootDirective;
        if (root && root._hasView)
            return false;
        let prev = this._prevDirective;
        while (prev && prev !== root) {
            if (prev._hasView)
                return false;
            prev = prev._prevDirective;
        }
        return true;
    }
};
exports.VElseIfDirective = VElseIfDirective;
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", Boolean),
    tslib_1.__metadata("design:paramtypes", [Boolean])
], VElseIfDirective.prototype, "elseIf", null);
exports.VElseIfDirective = VElseIfDirective = tslib_1.__decorate([
    (0, directive_1.Directive)({
        selector: '[v-else-if],[*else-if]',
        dirType: directive_2.DirectiveType.Conditional,
        priority: 10
    }),
    tslib_1.__metadata("design:paramtypes", [container_1.ViewContainerRef,
        template_1.TemplateRef])
], VElseIfDirective);
let VElseDirective = class VElseDirective extends BaseIfDirective {
    constructor(viewContainer, templateRef) {
        super(viewContainer, templateRef);
    }
    shouldShow() {
        const root = this._rootDirective;
        if (root && root._hasView)
            return false;
        let prev = this._prevDirective;
        while (prev && prev !== root) {
            if (prev._hasView)
                return false;
            prev = prev._prevDirective;
        }
        return true;
    }
};
exports.VElseDirective = VElseDirective;
exports.VElseDirective = VElseDirective = tslib_1.__decorate([
    (0, directive_1.Directive)({
        selector: '[v-else],[*else]',
        dirType: directive_2.DirectiveType.Conditional,
        priority: 10
    }),
    tslib_1.__metadata("design:paramtypes", [container_1.ViewContainerRef,
        template_1.TemplateRef])
], VElseDirective);
function setupIfChain(directive, parentNode) {
    if (directive instanceof VIfDirective) {
        directive.parentNode = parentNode;
    }
    registerToIfChain(directive, parentNode);
}
//# sourceMappingURL=if.dir.js.map