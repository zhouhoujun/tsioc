import {
    AbstractInvocationFactory, ClassRef, createInjector, Exception, Injectable,
    Injector, Runtime, AbstractType, Provider, toProvider,
    InvokeOptions, RunContext, InjectFlags, createRunContext, InjectUtil
} from '@tsdi/ioc';
import { ReactiveEffect } from '../effect';
import { ComponentOptions, ComponentRef, ComponentFactory, ComponentDef } from '../refs/component';
import { TemplateCompiler } from '../template/compiler';
import { reactive } from '../reactive';
import { AfterContentInit, AfterViewInit, OnInit, OnDestroy } from '../lifecycle';
import { NodeInjector, getNodeOwnerInjector } from '../refs/injector';
import { EmbeddedViewRef } from '../refs/view';
import { ElementRef } from '../refs/element';
import { Renderer } from '../renderer/Renderer';
import { TemplateRef, TemplateFactory } from '../refs/template';
import { RNode, PROJECTION_NODES } from '../renderer/Node';
import { DirectiveRef } from '../refs/directive';
import { ViewChildMetadata, ViewChildrenMetadata, ContentChildMetadata, ContentChildrenMetadata } from '../decorators/query';
import { QueryList } from '../refs/query-list';
import { ViewContainerRef } from '../refs/container';
import { markQueryBoundary, ViewQueryIndex } from './query-index';
import { flushProjectionOutlets } from './projection';
import { takeRenderTasks } from './render-tasks';
import { mergeTemplateSchemas } from '../template/schema';
import { TEMPLATE_SCHEMAS } from '../template/schema-provider';
import { DefaultReactiveEffect } from './effect';
import { DIRECTIVES, CUSTOM_ELEMENTS } from '../decorators/directive';
import { COMPONENTS } from '../decorators/component';


/**
 * Compiled template factory cache, keyed by ComponentDef annotation, then by the
 * TemplateCompiler instance that produced it.
 *
 * Factories bake renderer-specific AST nodes (e.g. ConsoleElement trees from the
 * console compiler). Reusing a factory compiled by a different renderer (a
 * console-compiled factory inside an html mount) drops static attributes while
 * cloning v-for template nodes, because HtmlRenderer.getAttributes cannot read a
 * ConsoleElement's Map-based attributes. Keying per compiler instance keeps
 * same-renderer reuse while isolating cross-renderer (cross-Application.run) mounts.
 */
const tempFacCaches = new WeakMap<ComponentDef, Map<TemplateCompiler, TemplateFactory>>();


export class ComponentRefImpl<T> extends ComponentRef<T> {


    private _hostView?: EmbeddedViewRef<T>;
    private _elementRef?: ElementRef<any>;
    private initCalled = false;
    private afterViewInitCalled = false;
    private afterContentInitCalled = false;
    private queryUnsubscribe?: () => void;
    private queryResolveScheduled = false;
    private contentQueryIndex?: ViewQueryIndex;
    private contentInjector?: NodeInjector;
    private contentUnsubscribe?: () => void;
    private contentResolveScheduled = false;
    constructor(
        _classRef: ClassRef<T>,
        context: NodeInjector,
        options?: ComponentOptions) {
        super(_classRef, context, options);
        this._elementRef = options?.elementRef;
        context.setValue(ComponentRef, this);
        context.onDestroy(this);
    }

    get elementRef(): ElementRef<any> {
        return this._elementRef!;
    }

    get hostView(): EmbeddedViewRef<T> {
        return this._hostView!;
    }

    get def(): ComponentDef<T> {
        return this.classRef.getAnnotation<ComponentDef>();
    }

    private _inst?: T;
    get instance(): T {
        if (!this._inst) {
            this._inst = this.createInstance();
        }
        return this._inst;
    }


    async render(options?: { host?: RNode }): Promise<void> {
        if (this.injector.destroyed) {
            return;
        }
        const def = this.classRef.getAnnotation<ComponentDef>();
        if (!/\[\w+\]/.test(def.selector || '') && !def.template && !def.templateUrl) throw new Exception(this.classRef.className + ' template or templateUrl is required.')

        if (!this._elementRef) {
            let renderer = this.injector.get(Renderer, null);
            
            if (!renderer) {
                const templateCompiler = this.injector.get(TemplateCompiler, null);
                if (templateCompiler && (templateCompiler as any).renderer) {
                    renderer = (templateCompiler as any).renderer;
                }
            }
            
            if (!renderer) {
                throw new Exception('Template module renderer not initialized. Verify TemplateModule is properly configured with deps.');
            }
            
            this._elementRef = this.injector.getElementRef(renderer.createElement(def.selector ?? this.classRef.className));
            this.injector.setValue(ElementRef, this._elementRef);
        }
        this.injector.setPayload(this._elementRef);
        markQueryBoundary(this._elementRef?.nativeElement as RNode);
        if (!this.initCalled) {
            this.initCalled = true;
            const initResult = (this.instance as OnInit).onInit?.();
            if (initResult && typeof (initResult as Promise<void>).then === 'function') {
                await initResult;
                if (this.injector.destroyed) {
                    return;
                }
            }
        }
        const directives = this.injector.get(DIRECTIVES) || [];
        const customElements = this.injector.get(CUSTOM_ELEMENTS) || [];
        const components = this.injector.get(COMPONENTS) || [];
        
        const compiler = this.injector.get(TemplateCompiler);
        let tempFacs = tempFacCaches.get(def);
        if (!tempFacs) {
            tempFacs = new Map();
            tempFacCaches.set(def, tempFacs);
        }
        let factory = tempFacs.get(compiler);
        if (!factory) {
            const template = def.template || await fetchTemplate(def.templateUrl!);
            if (this.injector.destroyed) {
                return;
            }
            factory = compiler.compile<T>(template, {
                directives,
                components,
                customElements,
                schemas: mergeTemplateSchemas(
                    this.injector.get(TEMPLATE_SCHEMAS, null),
                    def.schemas
                )
            });
            tempFacs.set(compiler, factory);
        }
        this._hostView?.destroy();
        this.queryUnsubscribe?.();
        this.queryUnsubscribe = undefined;
        const host = this._elementRef;
        const templateRef = factory(host, this.injector);
        this.injector.setValue(TemplateRef, templateRef);
        this._hostView = templateRef.createEmbeddedView(this.instance, this.injector, undefined, {
            queryRoot: true,
            queryEnabled: !!(def.viewChilds?.length || def.viewChildrens?.length)
        });
        markQueryBoundary(this._elementRef?.nativeElement as RNode, this._hostView.queryIndex);
        this.attachHostViewToElement();
        const childRenders = takeRenderTasks(this.injector);
        if (childRenders.length) {
            await Promise.all(childRenders);
            if (this.injector.destroyed) {
                return;
            }
        }
        const renderer = this._hostView.injector.get(Renderer, null);
        if (renderer) {
            flushProjectionOutlets(this._elementRef?.nativeElement, renderer);
        }
        this.subscribeViewQueries();
        this.resolveContentChilds(def);
        this.resolveViewChilds(def);
        if (!this.afterContentInitCalled) {
            this.afterContentInitCalled = true;
            const contentInitResult = (this.instance as AfterContentInit).onAfterContentInit?.();
            if (contentInitResult && typeof (contentInitResult as Promise<void>).then === 'function') {
                await contentInitResult;
            }
        }
        if (!this.afterViewInitCalled) {
            this.afterViewInitCalled = true;
            const afterViewInitResult = (this.instance as AfterViewInit).onAfterViewInit?.();
            if (afterViewInitResult && typeof (afterViewInitResult as Promise<void>).then === 'function') {
                await afterViewInitResult;
            }
        }
    }

    protected attachHostViewToElement(): void {
        const hostElement = this._elementRef?.nativeElement as any;
        const rootNodes = this._hostView?.rootNodes || [];
        if (!hostElement || !rootNodes.length || typeof hostElement.appendChild !== 'function') {
            return;
        }

        const existingChildren = Array.isArray(hostElement.childNodes) ? hostElement.childNodes.slice() : [];
        existingChildren.forEach((child: any) => {
            if (rootNodes.includes(child)) {
                return;
            }
            if (typeof hostElement.removeChild === 'function') {
                hostElement.removeChild(child);
            }
        });

        rootNodes.forEach(node => {
            if (node && node.parentNode !== hostElement) {
                hostElement.appendChild(node);
            }
        });
    }

    protected resolveContentChilds(def: ComponentDef): void {
        const childQueries = def.contentChilds || [];
        const childrenQueries = def.contentChildrens || [];
        if (!childQueries.length && !childrenQueries.length) {
            return;
        }
        this.ensureContentIndex();
        this.refreshContentChilds(def);
    }

    private ensureContentIndex(): void {
        if (this.contentQueryIndex) {
            return;
        }
        const projected = (this._elementRef?.nativeElement as any)?.[PROJECTION_NODES] as RNode[] | undefined;
        this.contentQueryIndex = new ViewQueryIndex();
        this.contentInjector = this.injector.getParentInjector() ?? this.injector;
        this.contentQueryIndex.rebuild(projected || [], this.contentInjector);
        this.contentUnsubscribe = this.contentQueryIndex.onChange(() => this.scheduleContentResolve());
    }

    private refreshContentChilds(def: ComponentDef): void {
        const childQueries = def.contentChilds || [];
        childQueries.forEach(query => {
            const value = this.resolveContentChild(query);
            if (query.required && value == null) {
                const selector = query.selector ?? query.type;
                throw new Error(`ContentChild '${String(selector ?? query.propertyKey)}' not found on ${this.classRef.className}.`);
            }
            (this.instance as any)[query.propertyKey] = value;
        });
        const childrenQueries = def.contentChildrens || [];
        if (childrenQueries.length) {
            this.resolveContentChildrens(childrenQueries);
        }
    }

    private scheduleContentResolve(): void {
        if (this.contentResolveScheduled) {
            return;
        }
        this.contentResolveScheduled = true;
        Promise.resolve().then(() => {
            this.contentResolveScheduled = false;
            if (this.injector.destroyed) {
                return;
            }
            this.refreshContentChilds(this.def);
        });
    }

    protected resolveContentChild(query: ContentChildMetadata): any {
        const propertyType = query.type as AbstractType | undefined;
        const selector = query.selector ?? propertyType;
        if (!selector) {
            return undefined;
        }
        const index = this.contentQueryIndex;
        if (typeof selector === 'string') {
            const nodes = index?.queryByName(selector) ?? [];
            if (nodes.length) {
                return this.readNodeValue(nodes[0], query, propertyType, this.contentInjector);
            }
            const projected = (this._elementRef?.nativeElement as any)?.[PROJECTION_NODES] as RNode[] | undefined;
            const renderer = this._hostView?.injector.get(Renderer, null);
            const found = projected?.length && renderer
                ? renderer.querySelector(projected, selector)
                : null;
            return found ? this.readNodeValue(found, query, propertyType, this.contentInjector) : undefined;
        }
        const entries = index?.queryByType(selector as AbstractType) ?? [];
        return entries.length ? this.readNodeValue(entries[0].node, query, propertyType, this.contentInjector) : undefined;
    }

    protected resolveContentChildrens(queries: ContentChildrenMetadata[]): void {
        queries.forEach(query => {
            let list = (this.instance as any)[query.propertyKey] as QueryList<any>;
            if (!(list instanceof QueryList)) {
                list = new QueryList<any>();
                (this.instance as any)[query.propertyKey] = list;
            }
            const next = this.resolveContentChildren(query);
            if (query.required && next.length === 0) {
                const selector = query.selector ?? query.type;
                throw new Error(`ContentChildren '${String(selector ?? query.propertyKey)}' not found on ${this.classRef.className}.`);
            }
            const current = list.toArray();
            if (current.length !== next.length || current.some((value, index) => value !== next[index])) {
                list.reset(next);
            }
        });
    }

    protected resolveContentChildren(query: ContentChildrenMetadata): any[] {
        const propertyType = query.type as AbstractType | undefined;
        const selector = query.selector ?? propertyType;
        if (!selector) {
            return [];
        }
        const index = this.contentQueryIndex;
        if (typeof selector === 'string') {
            const nodes = index?.queryByName(selector) ?? [];
            return nodes.map(node => this.readNodeValue(node, query, propertyType, this.contentInjector));
        }
        return (index?.queryByType(selector as AbstractType) ?? [])
            .map(entry => this.readNodeValue(entry.node, query, propertyType, this.contentInjector));
    }

    protected resolveViewChilds(def: ComponentDef, mode: 'initial' | 'dynamic' = 'initial'): void {
        const queries = def.viewChilds || [];
        queries.forEach(query => {
            if (mode === 'dynamic' && query.static && (this.instance as any)[query.propertyKey] != null) {
                return;
            }
            const value = this.resolveViewChild(query);
            if (query.required && value == null) {
                const selector = query.selector ?? query.type;
                throw new Error(`ViewChild '${String(selector ?? query.propertyKey)}' not found on ${this.classRef.className}.`);
            }
            (this.instance as any)[query.propertyKey] = value;
        });
        const childrenQueries = def.viewChildrens || [];
        if (childrenQueries.length) {
            this.resolveViewChildrens(childrenQueries);
        }
    }

    protected resolveViewChildrens(queries: ViewChildrenMetadata[]): void {
        queries.forEach(query => {
            let list = (this.instance as any)[query.propertyKey] as QueryList<any>;
            if (!(list instanceof QueryList)) {
                list = new QueryList<any>();
                (this.instance as any)[query.propertyKey] = list;
            }
            const next = this.resolveViewChildren(query);
            if (query.required && next.length === 0) {
                const selector = query.selector ?? query.type;
                throw new Error(`ViewChildren '${String(selector ?? query.propertyKey)}' not found on ${this.classRef.className}.`);
            }
            const current = list.toArray();
            if (current.length !== next.length || current.some((value, index) => value !== next[index])) {
                list.reset(next);
            }
        });
    }

    protected resolveViewChildren(query: ViewChildrenMetadata): any[] {
        const propertyType = query.type as AbstractType | undefined;
        const selector = query.selector ?? propertyType;
        if (!selector || !this._hostView) {
            return [];
        }
        const index = this._hostView.queryIndex;
        if (typeof selector === 'string') {
            const nodes = index?.queryByName(selector) ?? [];
            if (nodes.length) {
                return nodes.map(node => this.readNodeValue(node, query, propertyType));
            }
            const found = this._hostView.queryAll(selector) || [];
            return found.map(result => result instanceof ElementRef
                ? this.readNodeValue(result.nativeElement as RNode, query, propertyType)
                : this.readResolvedValue(result, query, propertyType));
        }

        const entries = index?.queryByType(selector as AbstractType) ?? [];
        const results = entries.map(entry => this.readNodeValue(entry.node, query, propertyType));
        const fallback = this._hostView.queryAll(selector as any) || [];
        for (const found of fallback) {
            const value = this.readResolvedValue(found, query, propertyType);
            if (value != null && !results.includes(value)) {
                results.push(value);
            }
        }
        return results;
    }

    private subscribeViewQueries(): void {
        this.queryUnsubscribe?.();
        const index = this._hostView?.queryIndex;
        if (!index) {
            return;
        }
        this.queryUnsubscribe = index.onChange(() => this.scheduleViewChildResolve());
    }

    private scheduleViewChildResolve(): void {
        if (this.queryResolveScheduled) {
            return;
        }
        this.queryResolveScheduled = true;
        Promise.resolve().then(() => {
            this.queryResolveScheduled = false;
            if (this.injector.destroyed || !this._hostView || this._hostView.destroyed) {
                return;
            }
            this.resolveViewChilds(this.def, 'dynamic');
        });
    }

    protected resolveViewChild(query: ViewChildMetadata): any {
        const propertyType = query.type as AbstractType | undefined;
        const selector = query.selector ?? propertyType;
        if (!selector || !this._hostView) {
            return undefined;
        }
        const index = this._hostView.queryIndex;
        if (typeof selector === 'string') {
            // Local refs are indexed per view; first match stops at the first
            // child view instead of collecting every v-for row.
            const refNode = index?.queryFirstByName(selector);
            if (refNode) {
                return this.readNodeValue(refNode, query, propertyType);
            }
            // Also supports tag/attribute/CSS selectors such as `probe-child`.
            const found = this._hostView.query(selector);
            if (found) {
                if (found instanceof ElementRef) {
                    return this.readNodeValue(found.nativeElement as RNode, query, propertyType);
                }
                return this.readResolvedValue(found, query, propertyType);
            }
            return undefined;
        }

        const entry = index?.queryFirstByType(selector as AbstractType);
        if (entry) {
            return this.readNodeValue(entry.node, query, propertyType);
        }

        const result = this._hostView.query(selector as any);
        return this.readResolvedValue(result, query, propertyType);
    }

    protected readNodeValue(node: RNode, query: ViewChildMetadata | ViewChildrenMetadata | ContentChildMetadata | ContentChildrenMetadata, propertyType?: AbstractType, injector?: NodeInjector): any {
        const read = query.read as any;
        const targetInjector = getNodeOwnerInjector(node) ?? injector ?? this._hostView?.injector;
        if (read === TemplateRef || propertyType === TemplateRef) {
            return targetInjector?.getTemplateRef(node) ?? undefined;
        }
        if (read === ElementRef || propertyType === ElementRef) {
            return targetInjector?.getElementRef(node) ?? undefined;
        }
        if (read === ViewContainerRef || propertyType === ViewContainerRef) {
            return targetInjector?.getViewContainerRef(node) ?? undefined;
        }
        const componentRef = targetInjector?.getComponentRefByNode(node) ?? null;
        if (read === ComponentRef || propertyType === ComponentRef) {
            return componentRef ?? undefined;
        }
        const directiveRef = targetInjector?.getDirectiveRefByNode(node) ?? null;
        if (read === DirectiveRef || propertyType === DirectiveRef) {
            return directiveRef ?? undefined;
        }
        if (read && componentRef?.instance instanceof read) {
            return componentRef.instance;
        }
        if (read && directiveRef?.instance instanceof read) {
            return directiveRef.instance;
        }
        if (propertyType && componentRef?.instance instanceof propertyType) {
            return componentRef.instance;
        }
        if (propertyType && directiveRef?.instance instanceof propertyType) {
            return directiveRef.instance;
        }
        if (read) {
            const readInjector = componentRef?.injector ?? directiveRef?.injector ?? targetInjector;
            if (readInjector?.has(read)) {
                return readInjector.get(read);
            }
        }
        return componentRef?.instance
            ?? directiveRef?.instance
            ?? targetInjector?.getTemplateRef(node)
            ?? targetInjector?.getElementRef(node)
            ?? undefined;
    }

    protected readResolvedValue(result: any, query: ViewChildMetadata, propertyType?: AbstractType): any {
        if (!result) {
            return undefined;
        }
        const read = query.read as any;
        if (read === ComponentRef || propertyType === ComponentRef) {
            return result;
        }
        if (read === DirectiveRef || propertyType === DirectiveRef) {
            return result;
        }
        if (read === ElementRef || propertyType === ElementRef) {
            if (result instanceof ElementRef) {
                return result;
            }
            return result.elementRef ?? undefined;
        }
        if (read === TemplateRef || propertyType === TemplateRef) {
            if (result instanceof TemplateRef) {
                return result;
            }
            const node = result instanceof ElementRef ? result.nativeElement : result?.elementRef?.nativeElement;
            return node ? this._hostView?.injector.getTemplateRef(node) ?? undefined : undefined;
        }
        if (result instanceof ElementRef || result instanceof TemplateRef) {
            return result;
        }
        return result.instance ?? result;
    }

    protected override clean(): void {
        this.queryUnsubscribe?.();
        this.queryUnsubscribe = undefined;
        this.contentUnsubscribe?.();
        this.contentUnsubscribe = undefined;
        const def = this.def;
        [...(def.viewChildrens || []), ...(def.contentChildrens || [])].forEach(query => {
            const list = (this.instance as any)[query.propertyKey];
            if (list instanceof QueryList) {
                list.destroy();
            }
        });
        this.contentQueryIndex?.clear();
        this.contentQueryIndex = undefined;
        (this.instance as OnDestroy)?.onDestroy?.();
        super.clean();
        this.hostView?.destroy();
    }

    protected override process(option?: NodeInjector | InvokeOptions, resolveCtx?: RunContext) {
        return this.render(this.options);
    }

    protected override createInstance(context?: RunContext): T {
        const instance = super.createInstance(context ?? createRunContext(this.injector).setPayload(this._elementRef));
        const def = this.classRef.getAnnotation<ComponentDef>();
        return reactive(instance, this.injector.get(ReactiveEffect), def.computeds);
    }

}

@Injectable()
export class ComponentFactoryImpl extends AbstractInvocationFactory<ComponentOptions> implements ComponentFactory<ComponentOptions> {

    constructor(
        runtime: Runtime
    ) {
        super(runtime);
    }

    protected override getInjector<T>(typeRef: ClassRef<T>, options?: ComponentOptions): Injector {
        let injector = super.getInjector(typeRef, options);
        // 注入Renderer
        const def = typeRef.getAnnotation<ComponentDef>();
        if (def.imports?.length) {
            injector = createInjector(injector, options?.providers);
            InjectUtil.use(injector, def.imports);
        }
        return injector;
    }

    protected override createInstance<T>(typeRef: ClassRef<T>, context: NodeInjector, options?: ComponentOptions): ComponentRef<T> {
        return new ComponentRefImpl(typeRef, context, options);
    }


    protected override mergeProviders<T>(typeRef: ClassRef<T>, options?: ComponentOptions): Provider[] {
        const providers = super.mergeProviders(typeRef, options);
        if (options?.compiler) {
            providers.push(toProvider(TemplateCompiler, options.compiler));
        }
        if (options?.renderer) {
            providers.push(toProvider(Renderer, options.renderer));
        }
        return providers;
    }

    protected override createInjector<T>(typeRef: ClassRef<T>, injector: NodeInjector, options: ComponentOptions): NodeInjector {
        const context = new NodeInjector(injector, options);
        // Keep component instance resolution local to this node-scoped injector.
        InjectUtil.register(context, [typeRef.type as any]);
        if (!injector.has(ReactiveEffect)) {
            context.setValue(ReactiveEffect, new DefaultReactiveEffect(options))
        } else {
            context.setValue(ReactiveEffect, injector.get(ReactiveEffect))
        }
        
        if (!context.has(Renderer) && injector.has(Renderer)) {
            const parentRenderer = injector.get(Renderer);
            if (parentRenderer) {
                context.setValue(Renderer, parentRenderer);
            }
        }
        
        return context;
    }

    override create<T>(type: AbstractType<T> | ClassRef<T>, options?: ComponentOptions): ComponentRef<T> {
        return super.create(type, options) as ComponentRef<T>;
    }

}


async function fetchTemplate(url: string): Promise<string> {
    const response = await fetch(url);
    return await response.text();
}
