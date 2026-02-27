import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';

// Initialize Gemini SDK
// Note: File Search operations require the same API key as generation
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface FileSearchUploadResult {
    success: boolean;
    fileId?: string;
    error?: string;
}

export interface GroundingChunk {
    title?: string;
    uri?: string;
    [key: string]: any;
}

export interface GroundedGenerationResult {
    text: string;
    groundingChunks: GroundingChunk[];
    groundingSupports: any[];
}

export const GeminiFileSearchService = {

    /**
     * Create a new FileSearchStore for a project
     * Returns the store name (e.g. "fileSearchStores/abc123")
     */
    async createStore(projectId: string): Promise<string> {
        try {
            const store = await genai.fileSearchStores.create({
                config: {
                    displayName: `jstar-project-${projectId}`
                }
            });

            if (!store.name) {
                throw new Error('Store creation failed: Store name is missing');
            }

            console.log(`[GeminiFileSearch] Created store for project ${projectId}: ${store.name}`);
            return store.name;
        } catch (error) {
            console.error('[GeminiFileSearch] Failed to create store:', error);
            throw error;
        }
    },

    /**
     * Upload a document to an existing FileSearchStore
     * This handles the upload and waits for processing to complete
     */
    async uploadDocument(
        fileSearchStoreName: string,
        fileBuffer: Buffer,
        fileName: string,
        mimeType: string
    ): Promise<FileSearchUploadResult> {
        try {
            console.log(`[GeminiFileSearch] Uploading ${fileName} to ${fileSearchStoreName}...`);

            // 1. Upload the file to the store
            // Convert Buffer to Blob for the GenAI SDK
            // We use Uint8Array to avoid Buffer vs BlobPart type mismatches in some environments
            const fileBlob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });

            let operation = await genai.fileSearchStores.uploadToFileSearchStore({
                file: fileBlob,
                fileSearchStoreName,
                config: {
                    displayName: fileName,
                    mimeType
                }
            });

            // 2. Poll for completion
            // Upload is async, we need to wait for the operation to complete
            console.log(`[GeminiFileSearch] Waiting for processing (Op: ${operation.name})...`);

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                operation = await genai.operations.get({ operation });
            }

            // Check if successful
            // Operation result and error properties might not be typed correctly in the current SDK version
            const opResult = (operation as any).result;
            const opError = (operation as any).error;

            // Debug logging to understand the response structure
            if (process.env.NODE_ENV === 'development') {
                console.log('[GeminiFileSearch] Operation completed:', JSON.stringify(operation, null, 2));
            }

            if (opResult?.name) { // The result is the File resource name
                const fileId = opResult.name;
                console.log(`[GeminiFileSearch] Upload complete: ${fileId}`);
                return { success: true, fileId };
            } else if (opError) {
                console.error('[GeminiFileSearch] Processing failed:', opError);
                return { success: false, error: opError.message || 'Processing failed' };
            } else if (operation.done) {
                // Fallback: If done is true and no error, assume success but warn about missing ID
                // Sometimes the result is nested differently or strict types hide it
                console.warn('[GeminiFileSearch] Operation done but result structure unclear. Assuming success.');
                const fallbackId = (operation as any).response?.name || (operation as any).metadata?.name;
                return { success: true, fileId: fallbackId };
            }

            return { success: false, error: 'Unknown upload result - operation finished but no result/error found' };

        } catch (error: any) {
            console.error('[GeminiFileSearch] Upload exception:', error);
            return { success: false, error: error.message || 'Upload exception' };
        }
    },

    /**
     * Generate content with File Search grounding (RAG)
     * Used for Q&A where direct quotes/citations are needed
     */
    async generateWithGrounding(
        prompt: string,
        fileSearchStoreIds: string[],
        model: string = 'gemini-2.5-flash'
    ): Promise<GroundedGenerationResult> {
        try {
            const response = await genai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    tools: [{
                        fileSearch: {
                            fileSearchStoreNames: fileSearchStoreIds
                        }
                    }]
                }
            });

            const candidate = response.candidates?.[0];
            const text = candidate?.content?.parts?.[0]?.text || '';
            const groundingMetadata = candidate?.groundingMetadata;

            return {
                text,
                groundingChunks: groundingMetadata?.groundingChunks || [],
                groundingSupports: groundingMetadata?.groundingSupports || []
            };

        } catch (error) {
            console.error('[GeminiFileSearch] Generation failed:', error);
            throw error;
        }
    },

    /**
     * Generate content stream with File Search grounding
     */
    async generateWithGroundingStream(
        prompt: string,
        fileSearchStoreIds: string[],
        model: string = 'gemini-2.5-flash'
    ) {
        try {
            const result = await genai.models.generateContentStream({
                model,
                contents: prompt,
                config: {
                    tools: [{
                        fileSearch: {
                            fileSearchStoreNames: fileSearchStoreIds
                        }
                    }]
                }
            });

            return result;
        } catch (error) {
            console.error('[GeminiFileSearch] Stream generation failed:', error);
            throw error;
        }
    },

    /**
     * Delete a FileSearchStore (cleanup)
     */
    async deleteStore(fileSearchStoreName: string): Promise<void> {
        try {
            await genai.fileSearchStores.delete({ name: fileSearchStoreName });
            console.log(`[GeminiFileSearch] Deleted store: ${fileSearchStoreName}`);
        } catch (error) {
            console.error('[GeminiFileSearch] Failed to delete store:', error);
            // Don't throw, just log - cleanup shouldn't block other actions
        }
    }
};
