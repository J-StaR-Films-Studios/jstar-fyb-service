import { NextRequest, NextResponse } from 'next/server';
import { DiagramService } from '@/services/diagram.service';
import { getSession } from '@/lib/auth-server';
import { canAccessWorkspace } from '@/lib/workspace-access';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });
  if (!await canAccessWorkspace(id, session.user.id)) return new NextResponse('Forbidden', { status: 403 });

  const diagrams = await DiagramService.getProjectDiagrams(id);
  return NextResponse.json(diagrams);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });
  if (!await canAccessWorkspace(id, session.user.id)) return new NextResponse('Forbidden', { status: 403 });

  const body = await req.json();
  const diagram = await DiagramService.createDiagram({
    ...body,
    projectId: id,
  });

  return NextResponse.json(diagram);
}
