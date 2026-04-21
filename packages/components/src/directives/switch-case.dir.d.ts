import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';
import { RNode } from '../renderer/Node';
interface SwitchChain {
    switchDirective: SwitchDirective;
    cases: CaseDirective[];
    defaults: DefaultDirective[];
    parentNode: RNode;
}
export declare function getSwitchChains(): WeakMap<RNode, SwitchChain>;
export declare class SwitchDirective {
    private _value;
    parentNode: RNode | null;
    constructor();
    set switch(value: any);
    registerCase(caseDirective: CaseDirective): void;
    unregisterCase(caseDirective: CaseDirective): void;
    registerDefault(defaultDirective: DefaultDirective): void;
    unregisterDefault(defaultDirective: DefaultDirective): void;
    private updateCases;
    onInit(): void;
    onDestroy(): void;
}
export declare function registerSwitchDirective(directive: SwitchDirective, parentNode: RNode | null): void;
export declare function findSwitchDirective(parentNode: RNode | null): SwitchDirective | null;
export declare class CaseDirective {
    private viewContainer;
    private _switchDirective;
    private _hasView;
    private _context;
    private _caseValue;
    private _template;
    constructor(viewContainer: ViewContainerRef, templateRef: TemplateRef<any>, _switchDirective: SwitchDirective);
    set context(ctx: any);
    set case(value: any);
    set template(templateRef: TemplateRef<any>);
    updateView(switchValue: any): boolean;
    private createView;
    clearView(): void;
    onDestroy(): void;
}
export declare class DefaultDirective {
    private viewContainer;
    private _switchDirective;
    private _hasView;
    private _context;
    private _template;
    constructor(viewContainer: ViewContainerRef, templateRef: TemplateRef<any>, _switchDirective: SwitchDirective);
    set context(ctx: any);
    set template(templateRef: TemplateRef<any>);
    updateView(shouldShow: boolean): void;
    private createView;
    clearView(): void;
    private canShowDefaultView;
    onDestroy(): void;
}
export {};
