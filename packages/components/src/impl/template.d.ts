import { NodeFactory, TemplateRef } from '../refs/template';
import { ElementRef } from '../refs/element';
import { NodeInjector } from '../refs/injector';
import { RNode } from '../renderer/Node';
export declare function createTemplateRef<C = any>(rootNodes: RNode[] | NodeFactory<C>, elementRef: ElementRef, options?: {
    context?: any;
    injector?: NodeInjector;
}): TemplateRef<C>;
