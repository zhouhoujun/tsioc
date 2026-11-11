import { token } from '@tsdi/ioc';
import { TraceExporter } from './tracer';
import { TracingOptions } from './tracing';

/** Tracing options token. */
export const TRACING_OPTIONS = token<TracingOptions>('TRACING_OPTIONS');

/** Multi token for trace exporters. */
export const TRACE_EXPORTERS = token<TraceExporter[]>('TRACE_EXPORTERS');
