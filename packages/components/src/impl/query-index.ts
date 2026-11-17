import { ComponentRef } from '../refs/component';
import { DirectiveRef } from '../refs/directive';
import { NodeInjector, getNodeOwnerInjector } from '../refs/injector';
import { LOCAL_REFS, RNode } from '../renderer/Node';

export interface ViewQueryEntry {
    node: RNode;
    componentRef?: ComponentRef<any>;
    directiveRef?: DirectiveRef<any>;
}

/**
 * Per-view index for `@ViewChild`/`@ViewChildren` lookups.
 *
 * Built once when an embedded view is created (before bindings run, so only
 * this view's own nodes are visited), then child indexes are mounted as nested
 * views are created. Structural changes only mark the index dirty and notify
 * listeners; queries never walk the tree again.
 */
export class ViewQueryIndex {
    parent?: ViewQueryIndex;

    private refs = new Map<string, RNode[]>();
    private allEntries: ViewQueryEntry[] = [];
    private children: ViewQueryIndex[] = [];
    private rootNodes: RNode[] = [];
    private ownNodes: RNode[] = [];
    private injector?: NodeInjector;
    private listeners = new Set<() => void>();
    private typesReady = false;

    constructor(parent?: ViewQueryIndex) {
        this.parent = parent;
    }

    mount(child: ViewQueryIndex): void {
        if (this.children.includes(child)) {
            return;
        }
        child.parent?.unmount(child);
        child.parent = this;
        this.children.push(child);
        this.touch();
    }

    unmount(child: ViewQueryIndex): void {
        const index = this.children.indexOf(child);
        if (index >= 0) {
            this.children.splice(index, 1);
            this.touch();
        }
    }

    /**
     * Capture this view's own nodes and local refs. Must run before bindings
     * create nested views, otherwise nested nodes would be indexed twice.
     */
    rebuild(nodes: RNode[], injector: NodeInjector): void {
        this.injector = injector;
        this.refs.clear();
        this.allEntries = [];
        this.ownNodes.forEach(node => {
            if (nodeQueryIndex.get(node) === this) {
                nodeQueryIndex.delete(node);
            }
        });
        this.rootNodes = nodes;
        this.ownNodes = [];
        this.typesReady = false;
        nodes.forEach(node => this.visit(node));
        this.touch();
    }

    /** Attach component/directive refs after bindings created them. */
    refreshTypes(): void {
        if (this.typesReady || !this.injector) {
            return;
        }
        this.typesReady = true;
        this.allEntries = [];
        for (const node of this.ownNodes) {
            const owner = getNodeOwnerInjector(node) ?? this.injector;
            const componentRef = owner.componentRefs.get(node);
            const directiveRefs = owner.directiveRefs.get(node);
            if (componentRef) {
                this.allEntries.push({ node, componentRef });
            }
            if (directiveRefs) {
                for (const directiveRef of directiveRefs) {
                    if (directiveRef?.instance) {
                        this.allEntries.push({ node, directiveRef });
                    }
                }
            }
        }
    }

    queryByName(name: string): RNode[] {
        const normalized = (name.startsWith('#') ? name.slice(1) : name).toLowerCase();
        if (!normalized) {
            return [];
        }
        const found: RNode[] = [];
        const own = this.refs.get(normalized);
        if (own?.length) {
            found.push(...own);
        }
        for (const child of this.children) {
            found.push(...child.queryByName(normalized));
        }
        return found;
    }

    /** Keep child query indexes in the same order as their container views. */
    reorderChildren(ordered: ViewQueryIndex[]): void {
        const wanted = ordered.filter(child => this.children.includes(child));
        if (!wanted.length) {
            return;
        }
        const wantedSet = new Set(wanted);
        let cursor = 0;
        let changed = false;
        for (let i = 0; i < this.children.length; i++) {
            if (!wantedSet.has(this.children[i])) {
                continue;
            }
            const next = wanted[cursor++];
            if (this.children[i] !== next) {
                this.children[i] = next;
                changed = true;
            }
        }
        if (changed) {
            this.touch();
        }
    }

    queryFirstByName(name: string): RNode | undefined {
        const normalized = (name.startsWith('#') ? name.slice(1) : name).toLowerCase();
        if (!normalized) {
            return undefined;
        }
        const own = this.refs.get(normalized);
        if (own?.length) {
            return own[0];
        }
        for (const child of this.children) {
            const found = child.queryFirstByName(normalized);
            if (found) {
                return found;
            }
        }
        return undefined;
    }

    queryFirstByType(type: any): ViewQueryEntry | undefined {
        this.refreshTypes();
        const own = this.allEntries.find(entry =>
            entry.componentRef?.instance instanceof type
            || entry.directiveRef?.instance instanceof type);
        if (own) {
            return own;
        }
        for (const child of this.children) {
            const found = child.queryFirstByType(type);
            if (found) {
                return found;
            }
        }
        return undefined;
    }

    /** Add a component created imperatively through ViewContainerRef. */
    addComponentRef(componentRef: ComponentRef<any>, refName?: string): void {
        const node = componentRef?.elementRef?.nativeElement as RNode | undefined;
        if (!node) {
            return;
        }
        let changed = false;
        if (!this.allEntries.some(entry => entry.componentRef === componentRef)) {
            this.allEntries.push({ node, componentRef });
            changed = true;
        }
        if (refName) {
            const key = refName.replace(/^#/, '').trim().toLowerCase();
            if (key) {
                const nodes = this.refs.get(key);
                if (!nodes) {
                    this.refs.set(key, [node]);
                    changed = true;
                } else if (!nodes.includes(node)) {
                    nodes.push(node);
                    changed = true;
                }
            }
        }
        if (changed) {
            this.touch();
        }
    }

    /** Remove a dynamically created component after its view is detached/destroyed. */
    removeComponentRef(componentRef: ComponentRef<any>): void {
        const node = componentRef?.elementRef?.nativeElement as RNode | undefined;
        let changed = false;
        const index = this.allEntries.findIndex(entry => entry.componentRef === componentRef);
        if (index >= 0) {
            this.allEntries.splice(index, 1);
            changed = true;
        }
        if (node) {
            this.refs.forEach((nodes, key) => {
                const refIndex = nodes.indexOf(node);
                if (refIndex >= 0) {
                    nodes.splice(refIndex, 1);
                    changed = true;
                    if (!nodes.length) {
                        this.refs.delete(key);
                    }
                }
            });
        }
        if (changed) {
            this.touch();
        }
    }

    queryByType(type: any): ViewQueryEntry[] {
        this.refreshTypes();
        const matches = (entry: ViewQueryEntry): boolean =>
            entry.componentRef?.instance instanceof type
            || entry.directiveRef?.instance instanceof type;
        const found = this.allEntries.filter(matches);
        for (const child of this.children) {
            found.push(...child.queryByType(type));
        }
        return found;
    }

    onChange(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /** Mark this view's query results dirty (e.g. a container inserted a view). */
    notifyChanged(): void {
        this.touch();
    }

    clear(): void {
        this.refs.clear();
        this.allEntries = [];
        this.ownNodes.forEach(node => {
            if (nodeQueryIndex.get(node) === this) {
                nodeQueryIndex.delete(node);
            }
        });
        this.rootNodes = [];
        this.ownNodes = [];
        this.typesReady = false;
        this.listeners.clear();
    }

    private visit(node: RNode): void {
        const owner = nodeQueryIndex.get(node);
        if (owner && owner !== this) {
            // A nested view already owns this subtree.
            return;
        }
        this.ownNodes.push(node);
        if (!owner) {
            nodeQueryIndex.set(node, this);
        }
        const localRefs = (node as any)[LOCAL_REFS] as string[] | undefined;
        if (localRefs?.length) {
            localRefs.forEach(ref => {
                const key = ref.trim().toLowerCase();
                if (!key) {
                    return;
                }
                const list = this.refs.get(key);
                if (list) {
                    list.push(node);
                } else {
                    this.refs.set(key, [node]);
                }
            });
        }
        // A child component host owns its own template scope; do not index its
        // internals into the parent view's query map.
        if (queryBoundaries.has(node)) {
            return;
        }
        node.childNodes?.forEach(child => this.visit(child));
    }

    private touch(): void {
        this.listeners.forEach(listener => listener());
        this.parent?.touch();
    }
}

const nodeQueryIndex = new WeakMap<RNode, ViewQueryIndex>();
const queryBoundaries = new WeakSet<RNode>();
const boundaryQueryIndex = new WeakMap<RNode, ViewQueryIndex>();

let currentCreatingIndex: ViewQueryIndex | undefined;

export function runWithQueryIndex<T>(index: ViewQueryIndex | undefined, fn: () => T): T {
    const previous = currentCreatingIndex;
    currentCreatingIndex = index;
    try {
        return fn();
    } finally {
        currentCreatingIndex = previous;
    }
}

export function markQueryBoundary(node: RNode | null | undefined, index?: ViewQueryIndex): void {
    if (!node || typeof node !== 'object') {
        return;
    }
    queryBoundaries.add(node);
    if (index) {
        boundaryQueryIndex.set(node, index);
    }
}

export function lookupQueryIndex(node: RNode | null | undefined): ViewQueryIndex | undefined {
    let current: any = node;
    while (current) {
        if (queryBoundaries.has(current)) {
            // Stop at the component boundary and use that component's own index
            // (undefined for components without queries). Never fall through to
            // the parent component's ViewChild scope.
            return boundaryQueryIndex.get(current) ?? currentCreatingIndex;
        }
        const index = nodeQueryIndex.get(current);
        if (index) {
            return index;
        }
        current = current.parentNode;
    }
    // Nodes created before the parent index rebuild (root node factories run
    // bindings before returning) fall back to the index being created.
    return currentCreatingIndex;
}
