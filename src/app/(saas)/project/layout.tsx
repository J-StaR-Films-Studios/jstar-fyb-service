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
            <SaasShell
                user={user}
                headerContent={isBuilderRoute ? <BuilderHeader /> : undefined}
                hideBottomNav={isBuilderRoute}
            >
                {children}
            </SaasShell>
        </BuilderLayoutProvider>
    );
}
