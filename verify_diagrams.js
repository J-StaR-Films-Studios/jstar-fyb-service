
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const diagrams = await prisma.projectDiagram.findMany({
        take: 10,
        orderBy: { updatedAt: 'desc' }
    });

    console.log('Found', diagrams.length, 'diagrams');
    diagrams.forEach(d => {
        console.log('ID:', d.id);
        console.log('Code Start:', d.mermaidCode.substring(0, 50));
        console.log('Contains Backticks:', d.mermaidCode.includes('`'));
        console.log('Contains mermaid tag:', d.mermaidCode.includes('mermaid'));
        console.log('---');
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
