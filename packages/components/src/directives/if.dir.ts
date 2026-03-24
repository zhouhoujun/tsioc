import { Directive } from '../decorators/directive';
import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';
import { Attribute } from '../decorators/atteribute';
import { DirectiveType } from '../refs/directive';
import { RNode } from '../renderer/Node';

interface IfChain {
    root: BaseIfDirective;
    siblings: BaseIfDirective[];
    parentNode: RNode;
}

const ifChains = new WeakMap<RNode, IfChain>();

function getOrCreateIfChain(parentNode: RNode): IfChain {
    let chain = ifChains.get(parentNode);
    if (!chain) {
        chain = { root: null!, siblings: [], parentNode };
        ifChains.set(parentNode, chain);
    }
    return chain;
}

function registerToIfChain(directive: BaseIfDirective, parentNode: RNode | null): BaseIfDirective | null {
    if (!parentNode) return null;
    
    const chain = getOrCreateIfChain(parentNode);
    
    if (!chain.root) {
        chain.root = directive;
        return null;
    }
    
    const lastSibling = chain.siblings.length > 0 
        ? chain.siblings[chain.siblings.length - 1] 
        : chain.root;
    
    (directive as any)._rootDirective = chain.root;
    (directive as any)._prevDirective = lastSibling;
    (lastSibling as any)._nextDirective = directive;
    chain.siblings.push(directive);
    
    return chain.root;
}

export abstract class BaseIfDirective {
    public _hasView = false;
    protected _context: any = null;
    protected _templateRef: TemplateRef<any>;
    protected _rootDirective: BaseIfDirective | null = null;
    protected _prevDirective: BaseIfDirective | null = null;
    protected _nextDirective: BaseIfDirective | null = null;

    constructor(
        protected viewContainer: ViewContainerRef,
        templateRef: TemplateRef<any>
    ) {
        this._templateRef = templateRef;
    }

    @Attribute()
    set context(ctx: any) {
        const changed = this._context !== ctx;
        this._context = ctx;
        if (changed) this.updateView();
    }

    @Attribute()
    set template(templateRef: TemplateRef<any>) {
        const changed = this._templateRef !== templateRef;
        this._templateRef = templateRef;
        if (changed) this.updateView();
    }

    protected createView() {
        if (!this._templateRef) {
            console.warn('BaseIfDirective: templateRef is not set');
            return;
        }
        this.viewContainer.createEmbeddedView(this._templateRef, this._context);
        this._hasView = true;
    }

    protected clearView() {
        this.viewContainer.clear();
        this._hasView = false;
    }

    protected updateView() {
        this.clearAllViews();
        if (this.shouldShow()) {
            this.createView();
        } else {
            this.checkNextSibling();
        }
    }

    private clearAllViews() {
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

    private checkNextSibling() {
        let next = this._nextDirective;
        while (next) {
            if (next.shouldShow()) {
                next.createView();
                return;
            }
            next = next._nextDirective;
        }
    }

    protected shouldShow(): boolean {
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

@Directive({
    selector: '[v-if],[*if]',
    dirType: DirectiveType.Conditional,
    priority: 10
})
export class VIfDirective extends BaseIfDirective {
    private _condition = false;
    public parentNode: RNode | null = null;

    constructor(
        viewContainer: ViewContainerRef,
        templateRef: TemplateRef<any>
    ) {
        super(viewContainer, templateRef);
    }

    @Attribute()
    set if(condition: boolean) {
        const changed = this._condition !== condition;
        this._condition = condition;
        if (changed) {
            this.updateView();
        }
    }

    protected override shouldShow(): boolean {
        return this._condition;
    }
}

@Directive({
    selector: '[v-else-if],[*else-if]',
    dirType: DirectiveType.Conditional,
    priority: 10
})
export class VElseIfDirective extends BaseIfDirective {
    private _condition?: boolean;

    constructor(
        viewContainer: ViewContainerRef,
        templateRef: TemplateRef<any>
    ) {
        super(viewContainer, templateRef);
    }

    @Attribute()
    set elseIf(condition: boolean) {
        const changed = this._condition !== condition;
        this._condition = condition;
        if (changed) {
            this.updateView();
        }
    }

    protected override shouldShow(): boolean {
        if (this._condition !== true) return false;
        const root = (this as any)._rootDirective as BaseIfDirective | null;
        if (root && root._hasView) return false;
        let prev = (this as any)._prevDirective as BaseIfDirective | null;
        while (prev && prev !== root) {
            if (prev._hasView) return false;
            prev = (prev as any)._prevDirective as BaseIfDirective | null;
        }
        return true;
    }
}

@Directive({
    selector: '[v-else],[*else]',
    dirType: DirectiveType.Conditional,
    priority: 10
})
export class VElseDirective extends BaseIfDirective {

    constructor(
        viewContainer: ViewContainerRef,
        templateRef: TemplateRef<any>
    ) {
        super(viewContainer, templateRef);
    }

    protected override shouldShow(): boolean {
        const root = (this as any)._rootDirective as BaseIfDirective | null;
        if (root && root._hasView) return false;
        let prev = (this as any)._prevDirective as BaseIfDirective | null;
        while (prev && prev !== root) {
            if (prev._hasView) return false;
            prev = (prev as any)._prevDirective as BaseIfDirective | null;
        }
        return true;
    }
}

export function setupIfChain(directive: BaseIfDirective, parentNode: RNode | null) {
    if (directive instanceof VIfDirective) {
        directive.parentNode = parentNode;
    }
    registerToIfChain(directive, parentNode);
}
