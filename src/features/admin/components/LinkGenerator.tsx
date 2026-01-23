"use client";

import { useState } from "react";
import { Copy, Link as LinkIcon, Check, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PRICING_CONFIG } from "@/config/pricing";
import { toast } from "sonner";

export function LinkGenerator() {
    const [open, setOpen] = useState(false);
    const [selectedTier, setSelectedTier] = useState<string>("");
    const [customPrice, setCustomPrice] = useState<boolean>(false);
    const [price, setPrice] = useState<number>(0);
    const [projectType, setProjectType] = useState<string>("paper");

    // Flatten tiers options for easy selection
    const paperTiers = PRICING_CONFIG.AGENCY.PAPER;
    const softwareTiers = PRICING_CONFIG.AGENCY.SOFTWARE;

    const handleTierChange = (value: string) => {
        setSelectedTier(value);

        // Find tier to set default price
        const paper = paperTiers.find(t => t.id === value);
        if (paper) {
            setPrice(paper.price);
            setProjectType("paper");
            return;
        }

        const software = softwareTiers.find(t => t.id === value);
        if (software) {
            setPrice(software.price);
            setProjectType("software");
            return;
        }
    };

    const generateLink = () => {
        if (!selectedTier) return "";

        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const params = new URLSearchParams({
            tier: selectedTier,
            price: price.toString(),
            type: projectType
        });

        return `${baseUrl}/agency/signup?${params.toString()}`;
    };

    const copyToClipboard = () => {
        const link = generateLink();
        if (!link) return;

        navigator.clipboard.writeText(link);
        toast.success("Link copied to clipboard!");
        setOpen(false);
    };

    const link = generateLink();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-white">
                    <LinkIcon className="w-4 h-4" />
                    <span className="hidden md:inline">Generate Link</span>
                    <span className="md:hidden">Link</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-[#0A0A0B] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-purple-400" />
                        Generate Signup Link
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Create a direct checkout link for new agency clients.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Tier Selection */}
                    <div className="space-y-2">
                        <Label>Select Package</Label>
                        <Select onValueChange={handleTierChange} value={selectedTier}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue placeholder="Choose a package tier..." />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1A1A1C] border-white/10 text-white">
                                <div className="p-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Software Projects</div>
                                {softwareTiers.map(tier => (
                                    <SelectItem key={tier.id} value={tier.id} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                        {tier.label}
                                    </SelectItem>
                                ))}
                                <div className="h-px bg-white/10 my-1" />
                                <div className="p-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Paper Only</div>
                                {paperTiers.map(tier => (
                                    <SelectItem key={tier.id} value={tier.id} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                        {tier.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Price Configuration */}
                    <div className="space-y-4 rounded-lg bg-white/5 p-4 border border-white/5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="custom-price" className="cursor-pointer">Custom Price?</Label>
                            <Switch
                                id="custom-price"
                                checked={customPrice}
                                onCheckedChange={setCustomPrice}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Price (NGN)</Label>
                            <Input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(Number(e.target.value))}
                                disabled={!customPrice}
                                className="bg-black/20 border-white/10 text-white font-mono"
                            />
                            {!customPrice && selectedTier && (
                                <p className="text-xs text-gray-500">
                                    Default price for this package. Enable custom price to override.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Result */}
                    {selectedTier && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                            <Label>Generated Link</Label>
                            <div className="flex gap-2">
                                <Input
                                    readOnly
                                    value={link}
                                    className="bg-black/40 border-green-500/20 text-green-400 font-mono text-xs"
                                />
                                <Button size="icon" onClick={copyToClipboard} className="shrink-0 bg-green-600 hover:bg-green-700 text-white">
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
