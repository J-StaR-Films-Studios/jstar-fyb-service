const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('src/lib/workspace-access.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function accessFor(project) {
    const prisma = {
        project: {
            findFirst: async ({ where }) => {
                assert.equal(JSON.stringify(where.OR), JSON.stringify([{ isUnlocked: true }, { testerAccess: true }]));
                return project && project.id === where.id && project.userId === where.userId &&
                    (project.isUnlocked || project.testerAccess) ? { id: project.id } : null;
            }
        }
    };
    const module = { exports: {} };
    vm.runInNewContext(code, {
        module,
        exports: module.exports,
        require: (name) => {
            assert.equal(name, '@/lib/prisma');
            return { prisma };
        }
    });
    return module.exports;
}

test('paid unlock survives revoking a tester pass', async () => {
    const project = { id: 'project', userId: 'owner', isUnlocked: true, testerAccess: false };
    const access = accessFor(project);
    assert.equal(access.hasWorkspaceAccess(project, 'owner'), true);
    assert.equal(await access.canAccessWorkspace('project', 'owner'), true);
});

test('an active pass admits its owner but not another user', async () => {
    const project = { id: 'project', userId: 'owner', isUnlocked: false, testerAccess: true };
    const access = accessFor(project);
    assert.equal(access.hasWorkspaceAccess(project, 'owner'), true);
    assert.equal(access.hasWorkspaceAccess(project, 'someone-else'), false);
    assert.equal(await access.canAccessWorkspace('project', 'owner'), true);
    assert.equal(await access.canAccessWorkspace('project', 'someone-else'), false);
});

test('revoking a pass closes unpaid workspace access', async () => {
    const project = { id: 'project', userId: 'owner', isUnlocked: false, testerAccess: false };
    const access = accessFor(project);
    assert.equal(access.hasWorkspaceAccess(project, 'owner'), false);
    assert.equal(await access.canAccessWorkspace('project', 'owner'), false);
    assert.equal(await access.canAccessWorkspace('missing', 'owner'), false);
});
