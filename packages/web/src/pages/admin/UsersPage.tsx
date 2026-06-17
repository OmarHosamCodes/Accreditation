import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppData } from "@/contexts/AppDataContext";
import { saveState } from "@/lib/api";
import { UserPlus } from "lucide-react";

export function UsersPage() {
  const { db, updateDB } = useAppData();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  if (!db) return null;

  if (!db.users) {
    db.users = [{ name: "Roaster", role: "admin", email: "roaster@accreditation.io" }];
  }

  const addUser = async () => {
    if (name.length < 2 || !/.+@.+\..+/.test(email)) {
      toast.error("Enter a name and valid email");
      return;
    }
    db.users!.push({ name, role: "auditor", email });
    try {
      await saveState(db, (m) => toast.error(m));
      updateDB({ ...db });
      toast.success(`Invited ${name}`);
      setName("");
      setEmail("");
    } catch {
      /* shown */
    }
  };

  const rmUser = async (index: number) => {
    db.users!.splice(index, 1);
    try {
      await saveState(db, (m) => toast.error(m));
      updateDB({ ...db });
    } catch {
      /* shown */
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Users</h1>
      <Card className="mb-8">
        <CardContent className="divide-y px-0 py-0">
          {db.users.map((u, i) => (
            <div key={u.email} className="flex items-center justify-between gap-4 p-4">
              <div>
                <span className="font-medium">{u.name}</span>{" "}
                <Badge variant="secondary" className="ml-1 text-[10px] uppercase">{u.role}</Badge>
                <p className="text-muted-foreground text-sm">{u.email}</p>
              </div>
              {u.role !== "admin" ? (
                <Button size="sm" variant="ghost" onClick={() => void rmUser(i)}>Remove</Button>
              ) : (
                <span className="text-muted-foreground text-xs">owner</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wide uppercase">Invite a co-auditor</h2>
      <Card className="max-w-md">
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="us_name">Name</Label>
            <Input id="us_name" placeholder="Jane Auditor" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="us_email">Email</Label>
            <Input id="us_email" placeholder="jane@…" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button onClick={() => void addUser()}>
            <UserPlus className="size-4" />
            Send invite
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
