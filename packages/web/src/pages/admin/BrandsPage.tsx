import type { Brand, Platform } from "@accreditation/shared";
import { Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminFormDrawer } from "@/components/admin/AdminFormDrawer";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PlatformBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/AdminTable";
import { useAppData } from "@/contexts/AppDataContext";
import { useAdminMutation } from "@/hooks/useAdminMutation";
import * as adminApi from "@/lib/admin-api";
import { fmtDate } from "@/lib/state";

const emptyBrand = (): Partial<Brand> => ({
  name: "",
  platform: "ig",
  url: "",
  handle: "",
  contact_email: "",
  niche: "",
});

export function BrandsPage() {
  const { db } = useAppData();
  const { mutate, pending } = useAdminMutation();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState<Partial<Brand>>(emptyBrand());
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const brands = useMemo(() => {
    if (!db) return [];
    const q = search.toLowerCase();
    return db.brands.filter(
      (b) =>
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.handle.toLowerCase().includes(q) ||
        b.niche.toLowerCase().includes(q),
    );
  }, [db, search]);

  if (!db) return null;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyBrand());
    setDrawerOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditing(brand);
    setForm({ ...brand });
    setDrawerOpen(true);
  };

  const saveBrand = async () => {
    const fn = editing
      ? () => adminApi.updateBrand(editing.id, form)
      : () => adminApi.createBrand(form);
    const res = await mutate(fn, { success: editing ? "Brand updated" : "Brand created" });
    if (res) {
      setDrawerOpen(false);
      setEditing(null);
    }
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    const res = await mutate(() => adminApi.deleteBrand(deleteId), { success: "Brand deleted" });
    if (res) setDeleteId(null);
  };

  return (
    <div>
      <AdminPageHeader
        title="Brands"
        description="Manage audited brands and their profile metadata."
        meta={`${brands.length} brand(s)`}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            Add brand
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          className="pl-9"
          placeholder="Search brands…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {brands.length ? (
        <AdminTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Name</TableHead>
                <TableHead scope="col">Platform</TableHead>
                <TableHead scope="col">Niche</TableHead>
                <TableHead scope="col">Audits</TableHead>
                <TableHead scope="col">Created</TableHead>
                <TableHead scope="col" className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((brand) => {
                const auditCount = db.audits.filter((a) => a.brand_id === brand.id).length;
                return (
                  <TableRow key={brand.id}>
                    <TableCell>
                      <Link to={`/admin/brands/${brand.id}`} className="font-medium hover:underline">
                        {brand.name}
                      </Link>
                      <p className="text-muted-foreground text-xs">{brand.handle}</p>
                    </TableCell>
                    <TableCell>
                      <PlatformBadge platform={brand.platform} />
                    </TableCell>
                    <TableCell>{brand.niche}</TableCell>
                    <TableCell>{auditCount}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(brand.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(brand)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(brand.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </AdminTable>
      ) : (
        <AdminEmptyState title="No brands found">Create a brand or wait for applications.</AdminEmptyState>
      )}

      <AdminFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editing ? "Edit brand" : "Add brand"}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => void saveBrand()} disabled={pending}>
              {pending ? "Saving…" : "Save brand"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand_name">Name</Label>
            <Input id="brand_name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v as Platform })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ig">Instagram</SelectItem>
                <SelectItem value="fb">Facebook</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand_url">Profile URL</Label>
            <Input id="brand_url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand_handle">Handle</Label>
            <Input id="brand_handle" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand_email">Contact email</Label>
            <Input id="brand_email" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand_niche">Niche</Label>
            <Input id="brand_niche" value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} />
          </div>
        </div>
      </AdminFormDrawer>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete brand"
        description="This removes the brand record. Brands with linked audits or applications cannot be deleted."
        confirmLabel="Delete brand"
        destructive
        loading={pending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
