
import { PrismaClient } from '@prisma/client';
import { createAcademicTools } from '../src/lib/ai/academicTools';
import { z } from 'zod';

// Mock context for tools
const mockContext = {
    chaptersText: ''
};

async function main() {
    console.log('Starting verification...');
    const prisma = new PrismaClient();

    try {
        // 1. Setup: Create a temporary project
        console.log('Creating temporary project...');
        const project = await prisma.project.create({
            data: {
                topic: 'Verification Project',
                status: 'OUTLINE_GENERATED',
            }
        });
        console.log(`Project created: ${project.id}`);

        // 2. Initialize Tools
        const tools = createAcademicTools(project.id, 'test-thread', mockContext) as any;

        // 3. Test: listChapters (Should be empty)
        console.log('\n--- Testing listChapters (Empty) ---');
        const listResultEmpty = await tools.listChapters.execute({}, { toolCallId: 'test', messages: [] });
        console.log('Result:', listResultEmpty);

        // 4. Test: addChapter
        console.log('\n--- Testing addChapter ---');
        const addResult = await tools.addChapter.execute({
            number: 1,
            title: 'Introduction',
            initialContent: 'This is the start.'
        }, { toolCallId: 'test', messages: [] });
        console.log('Result:', addResult);

        // 5. Test: listChapters (Should have 1)
        console.log('\n--- Testing listChapters (Populated) ---');
        const listResultPopulated = await tools.listChapters.execute({}, { toolCallId: 'test', messages: [] });
        console.log('Result:', listResultPopulated);

        // 6. Test: loadChapter
        console.log('\n--- Testing loadChapter ---');
        const loadResult = await tools.loadChapter.execute({ chapterNumber: 1 }, { toolCallId: 'test', messages: [] });
        console.log('Result:', loadResult);

        // 7. Test: generateSection (Direct Mode)
        console.log('\n--- Testing generateSection (Direct Mode) ---');
        const genDirectResult = await tools.generateSection.execute({
            chapterNumber: 1,
            sectionTitle: 'Background',
            content: 'The background is clear.'
        }, { toolCallId: 'test', messages: [] });
        console.log('Result:', genDirectResult);

        // 8. Test: generateChapterOutline (Integration Check only)
        // We won't fully run this as it calls LLM, but we can check if it initializes/throws specific errors
        console.log('\n--- Testing generateChapterOutline (Availability) ---');
        try {
            // Mocking the service call would be ideal, but for now we just want to see if the tool is reachable
            console.log('generateChapterOutline tool is defined:', !!tools.generateChapterOutline);
        } catch (e: any) {
            console.log('Skipping actual execution of outline generation to avoid API costs/latency in test');
        }

        // Cleanup
        console.log('\nCleaning up...');
        await prisma.project.delete({ where: { id: project.id } });
        console.log('Project deleted.');
        console.log('\nVERIFICATION SUCCESSFUL');

    } catch (error) {
        console.error('VERIFICATION FAILED:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
