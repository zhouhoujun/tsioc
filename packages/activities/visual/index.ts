/**
 * Renderer-neutral visual workflow designer surface.
 *
 * This subpath intentionally avoids the package root entry (which also exports
 * every server Activity and optional transport plugin), so browser consumers can
 * bundle the designer without pulling protocol implementations.
 */
export * from '../src/visual';
export * from '../src/workflow-designer.module';
