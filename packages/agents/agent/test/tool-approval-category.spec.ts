import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DefaultApprovalStrategy, DEFAULT_APPROVAL_REQUIRED_RULES, classifyApprovalCategory } from '../src';

/**
 * Real finding: the documented default approval rules (`shell.exec`, `fs.write`)
 * never fired — the strategy compared rule strings with tool names, and no
 * approval category covered filesystem writes, so shell commands and file
 * edits ran without any approval prompt.
 */
@Suite('approval rules match tools by category')
export class ApprovalCategoryTest {
    @Test('shell.exec covers the sandbox tools')
    shellExecCoversSandbox() {
        const strategy = new DefaultApprovalStrategy(['shell.exec']);
        expect(strategy.requires('terminal', {})).toEqual(true);
        expect(strategy.requires('execute_code', {})).toEqual(true);
        expect(strategy.requires('git_operations', {})).toEqual(true);
        expect(strategy.requires('read_file', {})).toEqual(false);
    }

    @Test('fs.write covers the filesystem write tools only')
    fsWriteCoversWrites() {
        const strategy = new DefaultApprovalStrategy(['fs.write']);
        expect(strategy.requires('write_file', {})).toEqual(true);
        expect(strategy.requires('edit_file', {})).toEqual(true);
        expect(strategy.requires('apply_patch', {})).toEqual(true);
        expect(strategy.requires('delete_file', {})).toEqual(true);
        expect(strategy.requires('read_file', {})).toEqual(false);
        expect(strategy.requires('terminal', {})).toEqual(false);
    }

    @Test('the default rule list now gates shell and file writes')
    defaultsAreEffective() {
        const strategy = new DefaultApprovalStrategy(DEFAULT_APPROVAL_REQUIRED_RULES);
        expect(strategy.requires('terminal', {})).toEqual(true);
        expect(strategy.requires('write_file', {})).toEqual(true);
        expect(strategy.requires('edit_file', {})).toEqual(true);
        expect(strategy.requires('playwright_browser', {})).toEqual(true);
        expect(strategy.requires('read_file', {})).toEqual(false);
        expect(strategy.requires('list_dir', {})).toEqual(false);
    }

    @Test('an explicit tool name still matches directly, and empty rules allow everything')
    explicitAndEmptyRules() {
        expect(new DefaultApprovalStrategy(['write_file']).requires('write_file', {})).toEqual(true);
        expect(new DefaultApprovalStrategy([]).requires('terminal', {})).toEqual(false);
        expect(new DefaultApprovalStrategy([]).requires('write_file', {})).toEqual(false);
    }

    @Test('filesystem tools classify into their own category')
    fsCategory() {
        expect(classifyApprovalCategory('write_file')).toEqual('fs');
        expect(classifyApprovalCategory('delete_file')).toEqual('fs');
        expect(classifyApprovalCategory('terminal')).toEqual('sandbox');
        expect(classifyApprovalCategory('read_file')).toBeUndefined();
    }
}
