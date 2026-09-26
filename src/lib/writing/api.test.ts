import { test } from 'node:test';
import { equal } from 'node:assert/strict';
import { authorize } from './api';

test('writing access is project-owned and feature-gated', async () => {
  const old = process.env.ACADEMIC_PIPELINE_ENABLED;
  try {
    const other = { currentUser: async () => ({ id: 'user-a' }), projectOwner: async () => 'user-b' };
    delete process.env.ACADEMIC_PIPELINE_ENABLED;
    equal((await authorize('project-b', other))?.status, 404);
    process.env.ACADEMIC_PIPELINE_ENABLED = 'true';
    equal((await authorize('project-b', other))?.status, 403);
    equal((await authorize('project-b', { ...other, currentUser: async () => null }))?.status, 401);
    equal((await authorize('project-b', { ...other, projectOwner: async () => null }))?.status, 404);
    equal(await authorize('project-b', { ...other, projectOwner: async () => 'user-a' }), null);
  } finally {
    if (old === undefined) delete process.env.ACADEMIC_PIPELINE_ENABLED;
    else process.env.ACADEMIC_PIPELINE_ENABLED = old;
  }
});
