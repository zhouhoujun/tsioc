import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    HarnessProfile,
    HARNESS_PROFILE_VERSION,
    snapshotHarnessProfile,
    applyHarnessProfile,
    diffHarnessProfiles,
    serializeHarnessProfile,
    parseHarnessProfile,
    createDefaultHarnessProfile,
    getBuiltinHarnessProfiles,
    resolveHarnessProfile,
    deriveGranularCategories
} from '../src/harness/HarnessProfile';
import { defaultAgentOptions, mergeAgentOptions } from '../src/options';

@Suite('B4 Harness Profile')
export class HarnessProfileTest {
    @Test('snapshot round-trips through serialize/parse')
    snapshotRoundTrips() {
        const profile: HarnessProfile = {
            name: 'demo',
            version: HARNESS_PROFILE_VERSION,
            requireApproval: ['shell.exec', { category: 'network', mode: 'auto-deny' }],
            sandbox: { mode: 'network-block', networkAllowlist: ['registry.npmjs.org'] },
            maxRepairRounds: 2,
            maxLoopRecoveries: 3,
            verificationWriteTools: ['write_file', 'edit_file'],
            formatter: null
        };
        const parsed = parseHarnessProfile(serializeHarnessProfile(profile));
        expect(parsed).toEqual(profile);
    }

    @Test('parse rejects malformed profiles')
    parseRejectsMalformed() {
        expect(() => parseHarnessProfile('{"version":1}')).toThrow(/name/);
        expect(() => parseHarnessProfile('{"name":"x"}')).toThrow(/version/);
        expect(() => parseHarnessProfile('[]')).toThrow(/object/);
        expect(() => parseHarnessProfile('null')).toThrow(/object/);
    }

    @Test('default profile snapshots defaultAgentOptions governance')
    defaultProfileMatchesDefaults() {
        const profile = createDefaultHarnessProfile();
        expect(profile.name).toEqual('default');
        expect(profile.version).toEqual(HARNESS_PROFILE_VERSION);
        expect(profile.requireApproval).toEqual(defaultAgentOptions.tools?.requireApproval);
        expect(profile.maxRepairRounds).toEqual(defaultAgentOptions.maxRepairRounds);
        expect(profile.maxLoopRecoveries).toEqual(defaultAgentOptions.maxLoopRecoveries);
        expect(profile.verificationWriteTools).toEqual(defaultAgentOptions.verificationWriteTools);
    }

    @Test('apply changes requireApproval through mergeAgentOptions')
    applyChangesRequireApproval() {
        const merged = mergeAgentOptions({ harnessProfile: 'strict' });
        expect(JSON.stringify(merged.tools?.requireApproval ?? [])).toContain('"category":"network"');
        expect(merged.maxRepairRounds).toEqual(1);
        expect(merged.sandbox?.mode).toEqual('network-block');
    }

    @Test('apply keeps explicit per-call options above the profile')
    explicitOptionsWinOverProfile() {
        const merged = mergeAgentOptions({
            harnessProfile: 'strict',
            maxRepairRounds: 5,
            tools: { requireApproval: ['echo'] }
        });
        expect(merged.maxRepairRounds).toEqual(5);
        expect(merged.tools?.requireApproval).toEqual(['echo']);
        expect(merged.sandbox?.mode).toEqual('network-block');
    }

    @Test('apply inline profile object works')
    applyInlineProfile() {
        const merged = mergeAgentOptions({
            harnessProfile: {
                name: 'inline',
                version: HARNESS_PROFILE_VERSION,
                maxLoopRecoveries: 9
            }
        });
        expect(merged.maxLoopRecoveries).toEqual(9);
    }

    @Test('unknown profile name falls back to defaults')
    unknownProfileFallsBack() {
        const merged = mergeAgentOptions({ harnessProfile: 'does-not-exist' });
        expect(merged.maxRepairRounds).toEqual(defaultAgentOptions.maxRepairRounds);
        expect(merged.tools?.requireApproval).toEqual(defaultAgentOptions.tools?.requireApproval);
        expect(resolveHarnessProfile('does-not-exist')).toBeUndefined();
    }

    @Test('diff is readable and omits equal fields')
    diffIsReadable() {
        const left: HarnessProfile = {
            name: 'a',
            version: HARNESS_PROFILE_VERSION,
            maxRepairRounds: 2,
            maxLoopRecoveries: 3
        };
        const right: HarnessProfile = {
            name: 'b',
            version: HARNESS_PROFILE_VERSION,
            maxRepairRounds: 1,
            maxLoopRecoveries: 3
        };
        const lines = diffHarnessProfiles(left, right);
        expect(lines.length).toEqual(1);
        expect(lines[0]).toContain('maxRepairRounds');
        expect(lines[0]).toContain('2');
        expect(lines[0]).toContain('1');
    }

    @Test('builtin profiles resolve by name')
    builtinResolveByName() {
        const registry = getBuiltinHarnessProfiles();
        expect(Object.keys(registry).sort()).toEqual(['default', 'strict']);
        expect(resolveHarnessProfile('default')?.name).toEqual('default');
        expect(resolveHarnessProfile('strict')?.name).toEqual('strict');
    }

    @Test('granular categories derive from object and string rules')
    granularCategoriesDerive() {
        const categories = deriveGranularCategories([
            'shell.exec',
            { category: 'network' },
            'web_search',
            { category: 'mcp', names: ['mcp.github'] }
        ]);
        expect(categories).toEqual(['sandbox', 'network', 'mcp']);
    }

    @Test('snapshot derives granular categories from approval rules')
    snapshotDerivesCategories() {
        const profile = snapshotHarnessProfile({
            tools: { requireApproval: [{ category: 'skill', names: ['skill.dev'] }] }
        });
        expect(profile.granularCategories).toEqual(['skill']);
    }

    @Test('mergeAgentOptions without profile is unchanged')
    noProfileIsUnchanged() {
        const merged = mergeAgentOptions({ maxRepairRounds: 4 });
        expect(merged.maxRepairRounds).toEqual(4);
        expect(merged.tools?.requireApproval).toEqual(defaultAgentOptions.tools?.requireApproval);
        expect(merged.harnessProfile).toBeUndefined();
    }
}
