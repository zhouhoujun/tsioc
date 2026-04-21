import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';
import { RNode } from '../renderer/Node';
export declare abstract class BaseIfDirective {
    protected viewContainer: ViewContainerRef;
    _hasView: boolean;
    protected _context: any;
    protected _templateRef: TemplateRef<any>;
    protected _rootDirective: BaseIfDirective | null;
    protected _prevDirective: BaseIfDirective | null;
    protected _nextDirective: BaseIfDirective | null;
    constructor(viewContainer: ViewContainerRef, templateRef: TemplateRef<any>);
    set context(ctx: any);
    set template(templateRef: TemplateRef<any>);
    protected createView(): void;
    protected clearView(): void;
    protected updateView(): void;
    private clearAllViews;
    private checkNextSibling;
    protected shouldShow(): boolean;
    onInit(): void;
    onDestroy(): void;
}
export declare class VIfDirective extends BaseIfDirective {
    private _condition;
    parentNode: RNode | null;
    constructor(viewContainer: ViewContainerRef, templateRef: TemplateRef<any>);
    set if(condition: boolean);
    protected shouldShow(): boolean;
}
export declare class VElseIfDirective extends BaseIfDirective {
    private _condition?;
    constructor(viewContainer: ViewContainerRef, templateRef: TemplateRef<any>);
    set elseIf(condition: boolean);
    protected shouldShow(): boolean;
}
export declare class VElseDirective extends BaseIfDirective {
    constructor(viewContainer: ViewContainerRef, templateRef: TemplateRef<any>);
    protected shouldShow(): boolean;
}
export declare function setupIfChain(directive: BaseIfDirective, parentNode: RNode | null): void;
