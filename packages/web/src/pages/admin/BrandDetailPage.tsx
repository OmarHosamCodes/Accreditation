import { ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AdminBreadcrumbs } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ApplicationStatusBadge, AuditStatusBadge, PlatformBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppData } from "@/contexts/AppDataContext";
import { useAdminMutation } from "@/hooks/useAdminMutation";
import * as adminApi from "@/lib/admin-api";
import { fmtDate } from "@/lib/state";

export function BrandDetailPage() {
  const { id } = useParams();
  const brandId = Number(id);
  const { db } = useAppData();
  const { mutate, pending } = useAdminMutation();
  const navigate = useNavigate();
  const [tab, setTab] = useState("applications");
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!db) return null;
  const brand = db.brands.find((b) => b.id === brandId);
  if (!brand) {
    return (
      <div>
        <p className="text-muted-foreground">Brand not found.</p>
        <Button variant="link" asChild className="mt-2 px-0">
          <Link to="/admin/brands">Back to brands</Link>
        </Button>
      </div>
    );
  }

  const applications = db.applications.filter((a) => a.brand_id === brandId);
  const audits = db.audits.filter((a) => a.brand_id === brandId);

  const handleDelete = async () => {
    const res = await mutate(() => adminApi.deleteBrand(brandId), { success: "Brand deleted" });
    if (res) navigate("/admin/brands");
  };

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Brands", to: "/admin/brands" }, { label: brand.name }]} />

      <AdminPageHeader
        title={brand.name}
        description={`${brand.handle} · ${brand.niche}`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <a href={brand.url} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                Open profile
              </a>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </>
        }
      />

      <dl className="bg-card mb-6 grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Platform</dt>
          <dd className="mt-1">
            <PlatformBadge platform={brand.platform} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Contact</dt>
          <dd className="mt-1">{brand.contact_email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Created</dt>
          <dd className="mt-1">{fmtDate(brand.created_at)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">URL</dt>
          <dd className="mt-1 truncate">{brand.url}</dd>
        </div>
      </dl>

      <Tabs>
        <TabsList>
          <TabsTrigger active={tab === "applications"} onClick={() => setTab("applications")}>
            Applications ({applications.length})
          </TabsTrigger>
          <TabsTrigger active={tab === "audits"} onClick={() => setTab("audits")}>
            Audits ({audits.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent className="mt-4">
          {tab === "applications" && (
            <div className="bg-card rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Type</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col">Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((ap) => (
                    <TableRow key={ap.id}>
                      <TableCell className="capitalize">{ap.type}</TableCell>
                      <TableCell>
                        <ApplicationStatusBadge status={ap.status} />
                      </TableCell>
                      <TableCell>{fmtDate(ap.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {tab === "audits" && (
            <div className="bg-card rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col">Score</TableHead>
                    <TableHead scope="col">Auditor</TableHead>
                    <TableHead scope="col">Date</TableHead>
                    <TableHead scope="col" className="text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audits.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell>
                        <AuditStatusBadge status={audit.status} />
                      </TableCell>
                      <TableCell>{audit.status === "published" ? audit.overall_score : "—"}</TableCell>
                      <TableCell>{audit.auditor}</TableCell>
                      <TableCell>{fmtDate(audit.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/admin/audits/${audit.id}`}>Details</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete brand"
        description="Brands with linked audits or applications cannot be deleted."
        confirmLabel="Delete brand"
        destructive
        loading={pending}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
