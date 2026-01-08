import { prisma } from '@/lib/prisma';
import { ProjectDiagram, Prisma } from '@prisma/client';

export class DiagramService {
  /**
   * Create a new diagram for a project
   */
  static async createDiagram(data: {
    projectId: string;
    title: string;
    diagramType: string;
    mermaidCode: string;
    description?: string;
  }): Promise<ProjectDiagram> {
    return prisma.projectDiagram.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        diagramType: data.diagramType,
        mermaidCode: data.mermaidCode,
        description: data.description,
        version: 1,
      },
    });
  }

  /**
   * Update an existing diagram
   * This creates a new version history logic if we were implementing full versioning,
   * but for now we just update the record and increment version.
   */
  static async updateDiagram(
    id: string,
    data: {
      mermaidCode?: string;
      title?: string;
      description?: string;
      diagramType?: string;
    }
  ): Promise<ProjectDiagram> {
    const current = await prisma.projectDiagram.findUnique({ where: { id } });
    if (!current) throw new Error('Diagram not found');

    return prisma.projectDiagram.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Get all diagrams for a project
   */
  static async getProjectDiagrams(projectId: string): Promise<ProjectDiagram[]> {
    return prisma.projectDiagram.findMany({
      where: { projectId, isArchived: false },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get a single diagram by ID
   */
  static async getDiagramById(id: string): Promise<ProjectDiagram | null> {
    return prisma.projectDiagram.findUnique({
      where: { id },
    });
  }

  /**
   * Soft delete a diagram (archive it)
   */
  static async deleteDiagram(id: string): Promise<ProjectDiagram> {
    return prisma.projectDiagram.update({
      where: { id },
      data: { isArchived: true },
    });
  }
}
