import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { SaasShell } from "@/features/ui/SaasShell";
import { BuilderLayoutProvider } from "@/features/builder/context/BuilderLayoutContext";
import { BuilderHeader } from "@/features/builder/components/BuilderHeader";

export default async function ProjectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();

    if (!user) {
        const headersList = await headers();
        const currentPath = headersList.get("x-current-path") || "/project/builder";
        redirect(`/auth/login?callbackUrl=${encodeURIComponent(currentPath)}`);
    }

    // Check if we're on the builder route to apply builder-specific UI
    const headersList = await headers();
    const pathname = headersList.get("x-current-path") || "";
    const isBuilderRoute = pathname.includes("/project/builder");

    return (
        <BuilderLayoutProvider>
            {isBuilderRoute ? (
                <div className="bg-dark min-h-screen text-white font-sans pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0 flex flex-col relative w-full overflow-hidden">
                    <BuilderHeader />
                    <div className="flex-1 w-full mx-auto relative h-full">
                        {children}
                    </div>
                </div>
            ) : (
                <SaasShell
                    user={user}
                >
                    {children}
                </SaasShell>
            )}
        </BuilderLayoutProvider>
    );
}
