const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('src/app/api/projects/[id]/threads/[threadId]/route.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function routeFor({ allowed, threadProject }) {
    let deletedMessages = 0;
    const prisma = {
        projectConversation: {
            findFirst: async ({ where }) => where.projectId === threadProject ? { id: where.id } : null,
            delete: async ({ where }) => ({ id: where.id })
        },
        projectChatMessage: { deleteMany: async () => { deletedMessages++; } },
        $transaction: async (operations) => Promise.all(operations)
    };
    const module = { exports: {} };
    const imports = {
        '@/lib/prisma': { prisma },
        '@/lib/auth-server': { getCurrentUser: async () => ({ id: 'owner' }) },
        '@/lib/workspace-access': { canAccessWorkspace: async () => allowed },
        'next/server': { NextResponse: { json: (body, options) => ({ ...body, status: options?.status ?? 200 }) } }
    };
    vm.runInNewContext(code, {
        module,
        exports: module.exports,
        console,
        require: (name) => {
            assert.ok(name in imports, `Unexpected dependency: ${name}`);
            return imports[name];
        }
    });
    return {
        call: () => module.exports.DELETE({}, { params: Promise.resolve({ id: 'own-project', threadId: 'thread' }) }),
        deletedMessages: () => deletedMessages
    };
}

test('a revoked pass cannot delete a workspace thread', async () => {
    const route = routeFor({ allowed: false, threadProject: 'own-project' });
    assert.equal((await route.call()).status, 403);
    assert.equal(route.deletedMessages(), 0);
});

test('a thread in another project cannot have its messages deleted', async () => {
    const route = routeFor({ allowed: true, threadProject: 'another-project' });
    assert.equal((await route.call()).status, 404);
    assert.equal(route.deletedMessages(), 0);
});

test('an owned, accessible project can delete its own thread', async () => {
    const route = routeFor({ allowed: true, threadProject: 'own-project' });
    assert.equal((await route.call()).status, 200);
    assert.equal(route.deletedMessages(), 1);
});
