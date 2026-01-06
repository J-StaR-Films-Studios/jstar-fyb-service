// @ts-ignore
import { BubbleMenu } from '@tiptap/react';
import { Editor } from '@tiptap/react';
import {
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ArrowDown,
    Trash2,
    Columns,
    Rows,
    X,
    Merge,
    Split,
    Heading,
    Table as TableIcon
} from 'lucide-react';

interface TableBubbleMenuProps {
    editor: Editor | null;
}

export function TableBubbleMenu({ editor }: TableBubbleMenuProps) {
    if (!editor) return null;

    return (
        // @ts-ignore
        <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100, placement: 'bottom', zIndex: 99999, maxWidth: 'none' }}
            shouldShow={({ editor }: { editor: any }) => editor.isActive('table')}
            className="flex items-center gap-0.5 p-1.5 bg-zinc-900 border border-white/10 rounded-lg shadow-xl backdrop-blur-md overflow-hidden z-[99999]"
        >
            {/* Columns Group */}
            <div className="flex items-center gap-0.5 px-1 pr-2 border-r border-white/10">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mr-1 hidden sm:inline-block">Col</span>
                <button
                    onClick={() => (editor.chain().focus() as any).addColumnBefore().run()}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors group relative"
                    title="Add Column Before"
                >
                    <div className="flex items-center">
                        <ArrowLeft className="w-3 h-3" />
                        <Columns className="w-4 h-4" />
                    </div>
                </button>
                <button
                    onClick={() => (editor.chain().focus() as any).addColumnAfter().run()}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                    title="Add Column After"
                >
                    <div className="flex items-center">
                        <Columns className="w-4 h-4" />
                        <ArrowRight className="w-3 h-3" />
                    </div>
                </button>
                <button
                    onClick={() => (editor.chain().focus() as any).deleteColumn().run()}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                    title="Delete Column"
                >
                    <div className="relative">
                        <Columns className="w-4 h-4 opacity-50" />
                        <X className="w-3 h-3 absolute -top-1 -right-1 font-bold" />
                    </div>
                </button>
            </div>

            {/* Rows Group */}
            <div className="flex items-center gap-0.5 px-2 border-r border-white/10">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mr-1 hidden sm:inline-block">Row</span>
                <button
                    onClick={() => (editor.chain().focus() as any).addRowBefore().run()}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                    title="Add Row Before"
                >
                    <div className="flex items-center flex-col gap-0 justify-center">
                        <ArrowUp className="w-3 h-2" />
                        <Rows className="w-4 h-4" />
                    </div>
                </button>
                <button
                    onClick={() => (editor.chain().focus() as any).addRowAfter().run()}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                    title="Add Row After"
                >
                    <div className="flex items-center flex-col gap-0 justify-center">
                        <Rows className="w-4 h-4" />
                        <ArrowDown className="w-3 h-2" />
                    </div>
                </button>
                <button
                    onClick={() => (editor.chain().focus() as any).deleteRow().run()}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                    title="Delete Row"
                >
                    <div className="relative">
                        <Rows className="w-4 h-4 opacity-50" />
                        <X className="w-3 h-3 absolute -top-1 -right-1" />
                    </div>
                </button>
            </div>

            {/* Cells/Merge Group */}
            <div className="flex items-center gap-0.5 px-2 border-r border-white/10">
                <button
                    onClick={() => (editor.chain().focus() as any).mergeCells().run()}
                    disabled={!(editor.can() as any).mergeCells()}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-20 disabled:hover:bg-transparent"
                    title="Merge Cells"
                >
                    <Merge className="w-4 h-4" />
                </button>
                <button
                    onClick={() => (editor.chain().focus() as any).splitCell().run()}
                    disabled={!(editor.can() as any).splitCell()}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-20 disabled:hover:bg-transparent"
                    title="Split Cell"
                >
                    <Split className="w-4 h-4" />
                </button>
            </div>

            {/* Table Properties */}
            <div className="flex items-center gap-0.5 pl-2">
                <button
                    onClick={() => (editor.chain().focus() as any).toggleHeaderRow().run()}
                    className={`p-1.5 rounded transition-colors ${editor.isActive('tablehHeader') ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
                    title="Toggle Header Row"
                >
                    <Heading className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button
                    onClick={() => (editor.chain().focus() as any).deleteTable().run()}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                    title="Delete Table"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </BubbleMenu>
    );
}
