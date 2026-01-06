"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, CheckCircle, SmartphoneCharging } from "lucide-react";

export function ResearchStatus({ projectId }: { projectId: string }) {
    const [stats, setStats] = useState({ total: 0, synced: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`/api/documents?projectId=${projectId}`);
                if (res.ok) {
                    const data = await res.json();
                    const docs = data.documents || [];
                    setStats({
                        total: docs.filter((d: any) => d.fileType !== 'link').length,
                        synced: docs.filter((d: any) => d.importedToFileSearch).length
                    });
                }
            } catch (e) {
                console.error(e);
            }
        };

        fetchStats();
        // Poll every 10s to keep in sync
        const interval = setInterval(fetchStats, 10000);
        return () => clearInterval(interval);
    }, [projectId]);

    if (stats.total === 0) return null;

    const isReady = stats.total > 0 && stats.synced === stats.total;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/20 rounded-lg border border-white/5">
            <BrainCircuit className={`w-4 h-4 ${isReady ? "text-green-400" : "text-purple-400"}`} />
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">AI Knowledge Base</span>
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{stats.synced}/{stats.total} Synced</span>
                    {isReady && <CheckCircle className="w-3 h-3 text-green-400" />}
                </div>
            </div>
        </div>
    );
}
