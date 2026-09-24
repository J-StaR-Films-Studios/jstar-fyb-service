import { NextRequest, NextResponse } from 'next/server';
import { DiagramService } from '@/services/diagram.service';
import { getSession } from '@/lib/auth-server';
import { canAccessWorkspace } from '@/lib/workspace-access';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; diagramId: string }> }
) {
  const { id, diagramId } = await params;
  const session = await getSession();
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });
  if (!await canAccessWorkspace(id, session.user.id)) return new NextResponse('Forbidden', { status: 403 });

  const diagram = await DiagramService.getDiagramById(diagramId);
  if (!diagram || diagram.projectId !== id) return new NextResponse('Not found', { status: 404 });

  return NextResponse.json(diagram);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; diagramId: string }> }
) {
  const { id, diagramId } = await params;
  const session = await getSession();
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });
  if (!await canAccessWorkspace(id, session.user.id)) return new NextResponse('Forbidden', { status: 403 });

  const existing = await DiagramService.getDiagramById(diagramId);
  if (!existing || existing.projectId !== id) return new NextResponse('Not found', { status: 404 });

  const { title, diagramType, mermaidCode, description } = await req.json();
  const diagram = await DiagramService.updateDiagram(diagramId, { title, diagramType, mermaidCode, description });

  return NextResponse.json(diagram);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; diagramId: string }> }
) {
  const { id, diagramId } = await params;
  const session = await getSession();
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });
  if (!await canAccessWorkspace(id, session.user.id)) return new NextResponse('Forbidden', { status: 403 });

  const existing = await DiagramService.getDiagramById(diagramId);
  if (!existing || existing.projectId !== id) return new NextResponse('Not found', { status: 404 });

  await DiagramService.deleteDiagram(diagramId);
  return new NextResponse(null, { status: 204 });
}
