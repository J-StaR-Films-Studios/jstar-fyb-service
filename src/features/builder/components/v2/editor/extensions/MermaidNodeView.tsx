import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { DiagramPreview } from '../../DiagramPreview';

export function MermaidNodeView(props: NodeViewProps) {
  const { code, id, title } = props.node.attrs;

  return (
    <NodeViewWrapper className="my-8">
      <div className="relative group rounded-lg overflow-hidden border border-gray-700 bg-gray-900/50">
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <span className="text-xs bg-black/50 text-white px-2 py-1 rounded backdrop-blur-sm">
                {title || 'Diagram'}
            </span>
        </div>
        <DiagramPreview
            code={code}
            theme="dark"
            className="border-0 bg-transparent min-h-[100px]"
        />
      </div>
    </NodeViewWrapper>
  );
}
