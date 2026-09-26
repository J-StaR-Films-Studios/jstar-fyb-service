import { authorize } from '@/lib/writing/api';
import { exportReadiness } from '@/lib/writing/export-readiness';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await authorize(id); if (denied) return denied;
  return Response.json(await exportReadiness(id));
}
