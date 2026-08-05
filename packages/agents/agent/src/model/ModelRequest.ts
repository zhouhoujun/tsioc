import { AgentMessage } from '../runtime/AgentMessage';
import { AgentToolDefinition } from '../tools/AgentTool';
import { AgentMemoryRecord } from '../memory/MemoryStore';

export interface ModelRequest {
    sessionId: string;
    messages: AgentMessage[];
    tools: AgentToolDefinition[];
    memory: AgentMemoryRecord[];
    summary?: string;
    /**
     * Optional external abort signal used to cancel an in-flight model request
     * (e.g. turn cancellation). Adapters that support it merge this signal with
     * their own timeout controller; other adapters simply ignore it.
     */
    signal?: AbortSignal;
    /**
     * Optional named model profile override. When set, the routed model
     * adapter resolves this profile explicitly and skips complexity/routes
     * matching. Used by delegation workers (spawn_agent / llm_task) to route
     * different worker classes to different models.
     */
    profile?: string;
    /**
     * B6: the current turn's falsification rate (fraction of measured tool
     * evidence falsified by the verification gate, 0-1). Undefined while no
     * tool evidence exists yet. The routed model adapter consumes this via
     * `when.falsifyRateGt` to switch to a stronger profile (or declare low
     * confidence) on high-failure trajectories.
     */
    falsifyRate?: number;
}
