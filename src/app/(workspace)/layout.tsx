import { ReactNode } from 'react';

export default function WorkspaceRouteLayout({ children }: { children: ReactNode }) {
    return (
        <div className="h-full w-full bg-dark text-white">
            {children}
        </div>
    );
}
