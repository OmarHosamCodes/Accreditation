import { Link } from "react-router-dom";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader, AdminSection, AdminStatCard } from "@/components/admin/AdminPageHeader";
import { AdminTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/AdminTable";
import { ApplicationStatusBadge, PlatformBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/contexts/AppDataContext";
import { fmtDate } from "@/lib/state";
import { Building2, ClipboardList, FileStack, Plug, Plus } from "lucide-react";

export function DashboardPage() {
  const { db } = useAppData();
  if (!db) return null;

  const pending = db.applications.filter((a) => a.status === "pending" || a.status === "in_progress").length;
  const draftAudits = db.audits.filter((a) => a.status === "draft").length;
  const published = db.audits.filter((a) => a.status === "published").length;
  const recentApps = [...db.applications].sort((a, b) => b.created_at - a.created_at).slice(0, 10);

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        description="Overview of queue activity, audits, and records."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/connect-extension">
                <Plug className="size-4" />
                Connect extension
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/admin/queue">Open queue</Link>
            </Button>
          </>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label="Awaiting action" value={pending} hint="Pending + in progress" to="/admin/queue" />
        <AdminStatCard label="Draft audits" value={draftAudits} to="/admin/audits?status=draft" />
        <AdminStatCard label="Published audits" value={published} to="/admin/audits?status=published" />
        <AdminStatCard label="Brands" value={db.brands.length} to="/admin/brands" />
      </div>

      <AdminSection title="Recent applications">
        {recentApps.length ? (
          <AdminTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Brand</TableHead>
                  <TableHead scope="col">Type</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Submitted</TableHead>
                  <TableHead scope="col" className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentApps.map((ap) => {
                  const brand = db.brands.find((b) => b.id === ap.brand_id);
                  return (
                    <TableRow key={ap.id}>
                      <TableCell>
                        {brand ? (
                          <Link to={`/admin/brands/${brand.id}`} className="font-medium hover:underline">
                            {brand.name}
                          </Link>
                        ) : (
                          <span className="font-medium">Unknown</span>
                        )}
                        {brand && (
                          <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                            <PlatformBadge platform={brand.platform} />
                            {brand.handle}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{ap.type}</TableCell>
                      <TableCell>
                        <ApplicationStatusBadge status={ap.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{fmtDate(ap.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="min-h-10" asChild>
                          <Link to="/admin/queue">Open queue</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </AdminTable>
        ) : (
          <AdminEmptyState icon={<ClipboardList className="size-9" />} title="No applications yet">
            Applications appear when someone submits the public apply form.
          </AdminEmptyState>
        )}
      </AdminSection>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/brands">
            <Building2 className="size-4" />
            Manage brands
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/brands">
            <Plus className="size-4" />
            Add brand
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/audits">
            <FileStack className="size-4" />
            View audits
          </Link>
        </Button>
      </div>
    </div>
  );
}
