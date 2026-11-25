/** Renderer-neutral catalog metadata for a common widget. */
export interface CatalogAttribute {
    name: string;
    type?: string;
    default?: string;
    required?: boolean;
    description?: string;
}

export interface CatalogExample {
    title: string;
    description?: string;
    props?: Record<string, unknown>;
}

export interface WidgetCatalogEntry {
    /** Widget directory/entry name, e.g. `dialog`, `data-table`. */
    name: string;
    selector: string;
    summary: string;
    attributes: CatalogAttribute[];
    /** Keyboard contract (navigation/activation/dismiss). */
    keyboard?: string[];
    /** Renderer-specific notes (DOM/TUI) when semantics differ. */
    surfaces?: { html?: string; console?: string };
    examples?: CatalogExample[];
}

/** Minimal filesystem surface so catalog collection stays renderer-neutral. */
export interface CatalogFileSystem {
    listDirectories(root: string): string[];
    listFiles(root: string): string[];
    exists(path: string): boolean;
    readText(path: string): string;
}
