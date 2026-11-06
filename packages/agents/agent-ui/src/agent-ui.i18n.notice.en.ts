import { NestedMessages } from '@tsdi/i18n';
import { AGENT_UI_NOTICE_EN_PART1 } from './agent-ui.i18n.notice.en.part1';
import { AGENT_UI_NOTICE_EN_PART2 } from './agent-ui.i18n.notice.en.part2';
import { AGENT_UI_NOTICE_EN_PART3 } from './agent-ui.i18n.notice.en.part3';
import { AGENT_UI_NOTICE_TAIL_EN } from './agent-ui.i18n.notice.tail.en';

/** agent-ui notice catalog; shards and tail preserve the original key order. */
export const AGENT_UI_NOTICE_EN: NestedMessages = {
  ...AGENT_UI_NOTICE_EN_PART1,
  ...AGENT_UI_NOTICE_EN_PART2,
  ...AGENT_UI_NOTICE_EN_PART3,
  ...AGENT_UI_NOTICE_TAIL_EN
};
