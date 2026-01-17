import { X } from "lucide-react";

interface JStarCollectivePopupProps {
    isOpen: boolean;
    onClose: () => void;
}

export function JStarCollectivePopup({ isOpen, onClose }: JStarCollectivePopupProps) {
    if (!isOpen) return null;

    const agents = [
        {
            initial: 'J',
            name: 'Jay',
            phase: 'PHASE 1',
            phaseColor: 'text-purple-400',
            gradient: 'from-purple-500 to-purple-800',
            role: 'Onboarding Expert – Finds your killer topic'
        },
        {
            initial: 'M',
            name: 'Monji',
            phase: 'PHASE 2',
            phaseColor: 'text-cyan-400',
            gradient: 'from-cyan-500 to-blue-600',
            role: 'Academic Copilot – Writes with precision & style'
        },
        {
            initial: 'N',
            name: 'Nengi',
            phase: 'ALWAYS ON',
            phaseColor: 'text-green-400',
            gradient: 'from-green-500 to-emerald-600',
            role: 'General Assistant – Brain dump & support'
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-dark border border-white/10 rounded-2xl w-full max-w-sm relative shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors z-10"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="p-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center mb-3 text-xl">🎓</div>
                    <h3 className="text-lg font-bold mb-1 text-white">The J Star Collective</h3>
                    <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                        Three AI personalities, each specialized for a different phase of your academic journey.
                    </p>

                    <div className="space-y-2">
                        {agents.map((agent) => (
                            <div key={agent.name} className="flex gap-3 p-2.5 rounded-lg bg-white/5 border border-white/5 hover:border-primary/30 transition-colors">
                                <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${agent.gradient} flex items-center justify-center font-bold text-white text-xs flex-shrink-0`}>
                                    {agent.initial}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-sm text-white">
                                        {agent.name} <span className={`text-[9px] ${agent.phaseColor} ml-1`}>{agent.phase}</span>
                                    </div>
                                    <div className="text-[11px] text-gray-500 truncate">{agent.role}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full mt-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-lg shadow-primary/20"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}
