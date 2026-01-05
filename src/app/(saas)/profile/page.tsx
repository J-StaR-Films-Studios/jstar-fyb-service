import { getCurrentUser } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { SaasShell } from "@/features/ui/SaasShell";
import { ProfileClient } from "./ProfileClient";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { prisma } from "@/lib/prisma";
import { TopicSwitchRequestForm } from "@/features/support/components/TopicSwitchRequestForm";
import { TopicSwitchPaymentVerifier } from "@/features/support/components/TopicSwitchPaymentVerifier";

export default async function ProfilePage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/auth/login?callbackUrl=/profile");
    }

    return (
        <SaasShell user={user}>
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-display font-bold mb-8">My Profile</h1>

                {/* Payment Verification Handler */}
                <TopicSwitchPaymentVerifier />
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                    <div className="flex flex-col md:flex-row items-center gap-6 mb-8 text-center md:text-left">
                        <UserAvatar name={user.name} image={user.image} size="lg" className="w-24 h-24 text-3xl shrink-0" />
                        <div>
                            <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                            <p className="text-gray-400">{user.email}</p>
                            <div className="mt-2 inline-flex px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider">
                                Active Account
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Account ID</h3>
                            <p className="font-mono text-sm text-gray-300 break-all">{user.id}</p>
                        </div>

                        <div className="border-t border-white/10 pt-6">
                            <ProfileClient />
                        </div>
                    </div>
                </div>

                {/* Project Settings / Topic Switch */}
                {await (async () => {
                    const project = await prisma.project.findFirst({
                        where: { userId: user.id },
                        orderBy: { createdAt: 'desc' }
                    });

                    if (!project) return null;

                    // Fetch any active topic switch request
                    const activeRequest = await prisma.topicSwitchRequest.findFirst({
                        where: {
                            projectId: project.id,
                            status: { in: ['pending', 'pending_payment', 'denied'] }
                        },
                        orderBy: { createdAt: 'desc' }
                    });

                    return (
                        <div className="mt-8">
                            <h2 className="text-xl font-display font-bold mb-4">Project Settings</h2>
                            <TopicSwitchRequestForm
                                project={project}
                                activeRequest={activeRequest}
                            />
                        </div>
                    );
                })()}

                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>J-Star FYB Service &copy; {new Date().getFullYear()}</p>
                </div>
            </div>
        </SaasShell>
    );
}
