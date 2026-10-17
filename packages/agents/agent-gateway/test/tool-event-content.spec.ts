import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    describeToolCompletedEvent,
    describeToolInvocationEvent,
    summarizeToolEventDetail
} from '../src/app-rpc/tool-event-content';

@Suite('gateway tool event content')
export class GatewayToolEventContentTest {
    @Test('invocation keeps the tool name and the input object')
    invocation() {
        expect(describeToolInvocationEvent({
            toolName: 'terminal',
            receipt: { inputSummary: "sed -n '1,120p' dist/src/cli.js" }
        })).toEqual("terminal · sed -n '1,120p' dist/src/cli.js");

        expect(describeToolInvocationEvent({
            toolName: 'read_file',
            inputSummary: '{"path":"/tmp/a.ts"}'
        })).toEqual('read_file · /tmp/a.ts');

        // No object at all: the bare tool name.
        expect(describeToolInvocationEvent({ toolName: 'read_file', receipt: {} })).toEqual('read_file');
    }

    @Test('completed keeps the object when the output does not repeat it')
    completedKeepsObject() {
        // Regression: the completed row replaces the invocation row (same
        // toolCallId), so dropping the input summary hid the acted-on command.
        expect(describeToolCompletedEvent({
            toolName: 'terminal',
            receipt: {
                inputSummary: "sed -n '1,120p' dist/src/cli.js",
                outputSummary: 'exit 0 · const token = argv[index];'
            }
        })).toEqual("terminal · sed -n '1,120p' dist/src/cli.js · exit 0 · const token = argv[index];");
    }

    @Test('completed does not repeat an object the output already carries')
    completedSkipsDuplicateObject() {
        expect(describeToolCompletedEvent({
            toolName: 'read_file',
            receipt: { inputSummary: 'src/cli.ts', outputSummary: 'src/cli.ts (truncated)' }
        })).toEqual('read_file · src/cli.ts (truncated)');
    }

    @Test('completed without an output summary falls back to a plain completion')
    completedWithoutOutput() {
        expect(describeToolCompletedEvent({ toolName: 'read_file', receipt: {} })).toEqual('read_file completed');
    }

    @Test('summarizeToolEventDetail parses JSON payloads and passes text through')
    summarizeDetail() {
        expect(summarizeToolEventDetail('read_file', '{"path":"src/cli.ts"}', 'input')).toEqual('src/cli.ts');
        expect(summarizeToolEventDetail('read_file', '{"path":"src/cli.ts","truncated":true}', 'output')).toEqual('src/cli.ts (truncated)');
        expect(summarizeToolEventDetail('terminal', 'exit 0 · ok', 'output')).toEqual('exit 0 · ok');
        expect(summarizeToolEventDetail('terminal', '   ', 'output')).toEqual('');
        expect(summarizeToolEventDetail('terminal', '{}', 'output')).toEqual('');
    }
}
