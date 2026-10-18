/**
 * Wording shared by every tool call that the user interrupted with Esc.
 *
 * Kept in one place so the coordinator, the child-process runner and the
 * individual tools all report the same terminal message.
 */
export const CANCELLED_MESSAGE = 'Command cancelled by the user.';
