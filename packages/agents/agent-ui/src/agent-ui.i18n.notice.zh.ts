import { NestedMessages } from '@tsdi/i18n';
import { AGENT_UI_NOTICE_ZH_PART1 } from './agent-ui.i18n.notice.zh.part1';
import { AGENT_UI_NOTICE_ZH_PART2 } from './agent-ui.i18n.notice.zh.part2';
import { AGENT_UI_NOTICE_ZH_PART3 } from './agent-ui.i18n.notice.zh.part3';
import { AGENT_UI_NOTICE_TAIL_ZH } from './agent-ui.i18n.notice.tail.zh';

/** agent-ui notice catalog; shards and tail preserve the original key order. */
export const AGENT_UI_NOTICE_ZH: NestedMessages = {
  ...AGENT_UI_NOTICE_ZH_PART1,
  ...AGENT_UI_NOTICE_ZH_PART2,
  ...AGENT_UI_NOTICE_ZH_PART3,
  ...AGENT_UI_NOTICE_TAIL_ZH
};
