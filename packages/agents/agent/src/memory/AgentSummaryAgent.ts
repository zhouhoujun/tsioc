import { Abstract } from '@tsdi/ioc';
import { AgentMessage } from '../runtime/AgentMessage';

/**
 * P74: session-level display metadata (title + one-line summary) generated
 * from the conversation transcript.
 *
 * This is intentionally separate from the context-compaction summarizer
 * (`SessionSummarizer`): the compaction summary is a five-field compression of
 * the whole conversation used to replace old history in the model context,
 * while this generator produces a short human-facing title and summary used
 * for session listings (`/projects`, `/threads`, UI headers). The display
 * summary is persisted via `SessionStore.setTitle` /
 * `setProjectMetadata({ focusSummary })` and never feeds the model context.
 */
export interface AgentSessionSummary {
    title?: string;
    summary?: string;
}

@Abstract()
export abstract class AgentSummaryAgent {
    /**
     * Generate display metadata for a session from its message transcript.
     * Both fields are optional: an implementation may produce only a title,
     * only a summary, or neither (returning an empty object when it cannot
     * derive anything useful). Implementations must never throw for malformed
     * input; callers fire-and-forget the result and treat failures as no-op.
     */
    abstract generate(messages: AgentMessage[]): Promise<AgentSessionSummary>;
}
