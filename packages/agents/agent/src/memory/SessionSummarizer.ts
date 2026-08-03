import { Abstract } from '@tsdi/ioc';
import { AgentMessage } from '../runtime/AgentMessage';
import { ToolEvidenceEntry } from '../harness/EvidenceLedger';

@Abstract()
export abstract class SessionSummarizer {
    /**
     * Summarize a session transcript. `evidence` optionally carries the
     * current turn's tool outcome ledger so summaries can reflect what
     * succeeded, failed, or was falsified (B5 evidence-based compaction).
     */
    abstract summarize(messages: AgentMessage[], evidence?: ToolEvidenceEntry[]): Promise<string>;
}
