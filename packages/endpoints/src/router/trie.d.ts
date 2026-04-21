import { Route, Routes } from './route';
export declare class TrieRoute {
    private options;
    private routes;
    children: Map<string, TrieRoute>;
    constructor(options: TrieOptions);
    find(method?: string): Route | undefined;
    filter(method?: string): Route[];
    has(route: Route): boolean;
    insert(route: Route, prefix?: string): boolean;
    remove(pathParts?: string[], index?: number, route?: Route): Promise<void>;
    bind(route: Route): boolean;
    get loaded(): boolean;
    match(parts: string[], index: number): Promise<TrieRoute | undefined>;
    protected recursive(node: TrieRoute, parts: string[], index: number, loading?: boolean): Promise<TrieRoute | undefined>;
    protected load(): Promise<void>;
}
export interface Wlidcard {
    wlidcard: string;
    match: (part: string, parts: string[], index: number) => boolean;
    toPath?: (part: string) => string;
    includeParent?: boolean;
    mutil?: boolean;
    startMutil?: boolean;
}
export interface TrieOptions {
    loader: (route: Route) => Promise<Routes>;
    toParts: (path: string) => string[];
    equals: (r1: Route, r2: Route) => boolean;
    wlidcards: Wlidcard[];
    microservice?: boolean;
}
export declare class TrieRouter {
    private options;
    private root;
    constructor(options: TrieOptions);
    insert(route: Route): boolean;
    match(path: string): Promise<TrieRoute | undefined>;
    match(parts: string[]): Promise<TrieRoute | undefined>;
    remove(): void;
    remove(route: Route): void;
    remove(path: string): void;
}
