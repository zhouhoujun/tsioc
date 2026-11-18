/**
 * Shared, renderer-neutral input helpers.
 *
 * The implementation is split by concern (`select`, `text`, `history`, `chunk`)
 * but this barrel keeps the historical `./input` entry point stable.
 */
export * from './input/select';
export * from './input/text';
export * from './input/history';
export * from './input/chunk';
export * from './text/brand';
export * from './text/slash-command';
