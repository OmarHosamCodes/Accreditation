import { useEffect, useState } from "react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { RoleBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminMutation } from "@/hooks/useAdminMutation";
import * as adminApi from "@/lib/admin-api";
import { UserPlus, Users } from "lucide-react";

export function UsersPage() {
  const { mutate, pending } = useAdminMutation();
  const [users, setUsers] = useState<adminApi.AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("auditor");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listUsers();
      if (res.users) setUsers(res.users);
    } catch {
      /* toast from api */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const addUser = async () => {
    const res = await mutate(
      () => adminApi.createUser({ name, email, password, role }),
      { success: `Created account for ${name}` },
    );
    if (res) {
      setName("");
      setEmail("");
      setPassword("");
      setRole("auditor");
      await loadUsers();
    }
  };

  const removeUser = async () => {
    if (!deleteId) return;
    const res = await mutate(() => adminApi.deleteUser(deleteId), { success: "User removed" });
    if (res) {
      setDeleteId(null);
      await loadUsers();
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Users"
        description="Better Auth accounts synced with auditor roles in app state."
        meta={`${users.length} user(s)`}
      />

      {loading ? (
        <div className="bg-card mb-8 space-y-3 rounded-lg border p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : users.length ? (
        <div className="bg-card mb-8 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Name</TableHead>
                <TableHead scope="col">Email</TableHead>
                <TableHead scope="col">Role</TableHead>
                <TableHead scope="col" className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id ?? u.email}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <RoleBadge role={u.role} />
                  </TableCell>
                  <TableCell className="text-right">
                    {u.id && (
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(u.id!)}>
                        Remove
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <AdminEmptyState icon={<Users className="size-9" />} title="No users">
          Invite a co-auditor below. The seeded admin is created on server startup.
        </AdminEmptyState>
      )}

      <AdminPageHeader title="Invite co-auditor" />
      <div className="bg-card max-w-md space-y-4 rounded-lg border p-4">
        <div className="space-y-2">
          <Label htmlFor="us_name">Name</Label>
          <Input id="us_name" placeholder="Jane Auditor" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="us_email">Email</Label>
          <Input id="us_email" type="email" placeholder="jane@…" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="us_pass">Temporary password</Label>
          <Input id="us_pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auditor">Auditor</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => void addUser()} disabled={pending}>
          <UserPlus className="size-4" />
          Create account
        </Button>
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remove user"
        description="This deletes the Better Auth account and removes them from the app user list."
        confirmLabel="Remove user"
        destructive
        loading={pending}
        onConfirm={() => void removeUser()}
      />
    </div>
  );
}
