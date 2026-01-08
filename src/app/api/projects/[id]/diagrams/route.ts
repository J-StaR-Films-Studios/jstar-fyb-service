import { NextRequest, NextResponse } from 'next/server';
import { DiagramService } from '@/services/diagram.service';
import { getSession } from '@/lib/auth-server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const diagrams = await DiagramService.getProjectDiagrams(id);
  return NextResponse.json(diagrams);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const body = await req.json();
  const diagram = await DiagramService.createDiagram({
    projectId: id,
    ...body,
  });

  return NextResponse.json(diagram);
}
