import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { OpenTelemetryAgentTelemetry } from '../src/harness/OpenTelemetryTelemetry';

@Suite('OTEL telemetry bridge')
export class OtelTelemetryTest {
    @Test('maps spans and status to the host tracer')
    mapsSpans() {
        const spans: any[] = [];
        const telemetry = new OpenTelemetryAgentTelemetry({
            startSpan: (name, options) => {
                const span: any = { name, attributes: { ...(options?.attributes ?? {}) }, ended: false };
                span.setAttribute = (key: string, value: any) => { span.attributes[key] = value; };
                span.setStatus = (status: any) => { span.status = status; };
                span.end = () => { span.ended = true; };
                spans.push(span);
                return span;
            }
        });
        telemetry.startSpan('tool.echo', { tool: 'echo' }).end('error', { error: 'boom' });
        expect(spans[0].name).toEqual('tool.echo');
        expect(spans[0].attributes.tool).toEqual('echo');
        expect(spans[0].attributes.error).toEqual('boom');
        expect(spans[0].status.code).toEqual(2);
        expect(spans[0].ended).toEqual(true);
    }

    @Test('is a no-op without a tracer')
    noTracer() {
        expect(() => new OpenTelemetryAgentTelemetry().startSpan('x').end('ok')).not.toThrow();
    }
}
