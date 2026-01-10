import { useState } from 'react';
import { Check, Loader2, Tag, X } from 'lucide-react';
import { toast } from 'sonner';

interface DiscountCodeInputProps {
    onValidCode: (code: string, discountAmount: number) => void;
    onClear: () => void;
    originalAmount: number;
    disabled?: boolean;
}

export function DiscountCodeInput({ onValidCode, onClear, originalAmount, disabled }: DiscountCodeInputProps) {
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>(null);

    const handleValidate = async () => {
        if (!code.trim()) return;

        setIsLoading(true);
        try {
            const res = await fetch('/api/discount/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code.trim(), amount: originalAmount })
            });

            const data = await res.json();

            if (data.valid) {
                setAppliedDiscount({ code: data.code, amount: data.discountAmount });
                onValidCode(data.code, data.discountAmount);
                toast.success('Discount applied!');
            } else {
                toast.error(data.error || 'Invalid discount code');
                setAppliedDiscount(null);
            }
        } catch (error) {
            console.error('Validation error:', error);
            toast.error('Failed to validate code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setCode('');
        setAppliedDiscount(null);
        onClear();
    };

    if (appliedDiscount) {
        return (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                        <Tag className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                            {appliedDiscount.code}
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded uppercase">Applied</span>
                        </div>
                        <div className="text-xs text-green-400">
                            You save ₦{appliedDiscount.amount.toLocaleString()}
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleClear}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex gap-2">
            <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="h-4 w-4 text-gray-500" />
                </div>
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Discount Code"
                    disabled={disabled || isLoading}
                    className="block w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 disabled:opacity-50 transition-all font-mono uppercase"
                    onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                />
            </div>
            <button
                onClick={handleValidate}
                disabled={disabled || !code.trim() || isLoading}
                className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
            </button>
        </div>
    );
}
