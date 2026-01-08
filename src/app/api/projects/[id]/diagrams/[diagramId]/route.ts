import { NextRequest, NextResponse } from 'next/server';
import { DiagramService } from '@/services/diagram.service';
import { getSession } from '@/lib/auth-server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; diagramId: string }> }
) {
  const { diagramId } = await params;
  const session = await getSession();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const diagram = await DiagramService.getDiagramById(diagramId);
  if (!diagram) return new NextResponse('Not found', { status: 404 });

  return NextResponse.json(diagram);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; diagramId: string }> }
) {
  const { diagramId } = await params;
  const session = await getSession();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const body = await req.json();
  const diagram = await DiagramService.updateDiagram(diagramId, body);

  return NextResponse.json(diagram);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; diagramId: string }> }
) {
  const { diagramId } = await params;
  const session = await getSession();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  await DiagramService.deleteDiagram(diagramId);
  return new NextResponse(null, { status: 204 });
}
