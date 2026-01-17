'use client';

import { useEffect, useState, useRef, memo } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import {
    EditorRoot,
    EditorContent,
    type EditorInstance,
} from 'novel';
import { TableBubbleMenu } from './TableBubbleMenu';
import { defaultExtensions } from './editor/extensions/defaultExtensions';

interface NovelEditorProps {
    content: string; // Markdown string
    onUpdate: (content: string) => void;
    projectId: string;
    className?: string;
    onEditorReady?: (editor: EditorInstance) => void;
}

// Extensions with Markdown support
const extensions = defaultExtensions;

export const NovelEditor = memo(({ content, onUpdate, projectId, className, onEditorReady }: NovelEditorProps) => {
    const [editorInstance, setEditorInstance] = useState<EditorInstance | null>(null);
    const initialContentRef = useRef<string>(content);
    const hasInitialized = useRef(false);

    // Set initial content when editor is ready
    useEffect(() => {
        if (editorInstance && !hasInitialized.current) {
            // Use setTimeout to avoid flushSync errors during initial render
            setTimeout(() => {
                if (!editorInstance.isDestroyed) {
                    if (content) {
                        editorInstance.commands.setContent(content);
                    }
                    hasInitialized.current = true;
                }
            }, 0);
        }
    }, [editorInstance, content, projectId]);

    // Sync content when it changes externally (e.g., chapter switching)
    useEffect(() => {
        if (editorInstance && hasInitialized.current) {
            // Only update if content prop is different from what we last initialized/synced
            // AND ensure we don't overwrite if the editor content matches (to avoid cursor jump)
            if (content !== initialContentRef.current) {
                const currentEditorMarkdown = editorInstance.storage.markdown?.getMarkdown?.() || '';

                // If the new content is exactly what's already in the editor (e.g. from typing), ignore
                if (content === currentEditorMarkdown) {
                    initialContentRef.current = content; // Just update ref
                    return;
                }

                // If content is truly different (external switch), update editor
                // Use setTimeout to avoid flushSync errors
                setTimeout(() => {
                    if (!editorInstance.isDestroyed) {
                        editorInstance.commands.setContent(content);
                        initialContentRef.current = content;
                    }
                }, 0);
            }
        }
    }, [content, editorInstance, projectId]);

    // Debounce the update callback to avoid expensive markdown serialization on every keystroke
    // This significantly improves performance for large documents
    // 1 second delay, max 5 seconds during continuous typing
    const debouncedOnUpdate = useDebouncedCallback(
        (editor: EditorInstance) => {
            const markdown = editor.storage.markdown?.getMarkdown?.() || editor.getText();
            onUpdate(markdown);
        },
        1000,
        { maxWait: 5000 }
    );

    const handleUpdate = ({ editor }: { editor: EditorInstance }) => {
        if (!editorInstance) {
            setEditorInstance(editor);
            onEditorReady?.(editor);
        }

        debouncedOnUpdate(editor);
    };

    const handleCreate = ({ editor }: { editor: EditorInstance }) => {
        setEditorInstance(editor);
        onEditorReady?.(editor);

        // Set initial content when editor is created
        if (content) {
            editor.commands.setContent(content);
        }
        hasInitialized.current = true;
    };

    return (
        <div className={`novel-editor-wrapper w-full h-full ${className || ''}`}>
            <EditorRoot>
                <EditorContent
                    initialContent={undefined}
                    extensions={extensions as any}
                    className="prose prose-invert prose-lg max-w-none min-h-[500px] w-full focus:outline-none"
                    editorProps={{
                        attributes: {
                            class: 'prose prose-invert prose-lg max-w-none min-h-[500px] w-full bg-transparent text-gray-300 font-serif text-lg leading-loose focus:outline-none p-0',
                        },
                    }}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                    slotAfter={null}
                    immediatelyRender={false}
                >
                    <TableBubbleMenu editor={editorInstance as any} />
                </EditorContent>
            </EditorRoot>
        </div>
    );
});

NovelEditor.displayName = 'NovelEditor';
