'use client';

import { useState, useTransition } from 'react';
import { updateSystemSetting } from '@/features/marketing/actions/marketing-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface SettingsFormProps {
    initialStart: Date | null;
    initialEnd: Date | null;
}

export function SettingsForm({ initialStart, initialEnd }: SettingsFormProps) {
    const [isPending, startTransition] = useTransition();
    // Format dates for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatDateForInput = (date: Date | null) => {
        if (!date) return '';
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };

    const [startDate, setStartDate] = useState(formatDateForInput(initialStart));
    const [endDate, setEndDate] = useState(formatDateForInput(initialEnd));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            try {
                if (startDate) await updateSystemSetting('marketing_timer_start', new Date(startDate).toISOString());
                if (endDate) await updateSystemSetting('marketing_timer_end', new Date(endDate).toISOString());
                toast.success('Settings updated successfully');
            } catch (error) {
                toast.error('Failed to update settings');
            }
        });
    };

    return (
        <div className="bg-[#111114] border border-white/5 rounded-xl p-6 max-w-2xl">
            <h3 className="text-xl font-display font-bold text-white mb-6">Landing Page Timer</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="startDate" className="text-gray-400">Campaign Start Date</Label>
                        <Input
                            id="startDate"
                            type="datetime-local"
                            value={startDate}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                            className="bg-black/20 border-white/10 text-white focus:border-primary/50"
                        />
                        <p className="text-xs text-gray-500">
                            The original start date of the campaign (used for "rush down" animation base).
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="endDate" className="text-gray-400">Campaign End Date</Label>
                        <Input
                            id="endDate"
                            type="datetime-local"
                            value={endDate}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                            className="bg-black/20 border-white/10 text-white focus:border-primary/50"
                        />
                        <p className="text-xs text-gray-500">
                            When the timer hits zero.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-white/5">
                    <Button
                        type="submit"
                        disabled={isPending}
                        className="bg-primary hover:bg-primary/90 text-black font-medium"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Settings
                    </Button>
                </div>
            </form>
        </div>
    );
}
