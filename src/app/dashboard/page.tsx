import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Plus, Calendar, Users } from "lucide-react";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { users, userRoles, roles } from "@/db/schema";
import { columns } from "./columns";
import { stackServerApp } from "@/stack";

export default async function Page() {
  const user = await stackServerApp.getUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  const userRoleData = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id));

  const isAdmin = userRoleData.some((r) => r.roleName === "Admin");

  if (!isAdmin) {
    redirect("/");
  }

  const data = await db.select().from(users);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Quick Actions Section */}
              <div className="px-4 lg:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                      Dashboard
                    </h2>
                    <p className="text-muted-foreground">
                      Welcome back! Here&apos;s an overview of your event
                      management.
                    </p>
                  </div>
                  <Link href="/dashboard/events/new">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Event
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Event Quick Stats Card */}
              <div className="px-4 lg:px-6">
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                      <Calendar className="h-5 w-5" />
                      Event Management
                    </CardTitle>
                    <CardDescription className="text-blue-700 dark:text-blue-300">
                      Get started by creating your first event or manage
                      existing ones
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                      <Link href="/dashboard/events/new" className="flex-1">
                        <Card className="transition-all duration-200 hover:shadow-md cursor-pointer border-blue-200 bg-white/50 dark:bg-blue-950/30 dark:border-blue-700">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="font-medium text-blue-900 dark:text-blue-100">
                                  New Event
                                </p>
                                <p className="text-sm text-blue-600 dark:text-blue-400">
                                  Create and configure
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                      <Link href="/dashboard/events" className="flex-1">
                        <Card className="transition-all duration-200 hover:shadow-md cursor-pointer border-blue-200 bg-white/50 dark:bg-blue-950/30 dark:border-blue-700">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </div>
                              <div>
                                <p className="font-medium text-blue-900 dark:text-blue-100">
                                  Manage Events
                                </p>
                                <p className="text-sm text-blue-600 dark:text-blue-400">
                                  View and edit
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable columns={columns} data={data} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
