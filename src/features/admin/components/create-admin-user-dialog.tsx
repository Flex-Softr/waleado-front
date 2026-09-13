"use client";

import * as React from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { createAdminManagedUser } from "@/features/admin/lib/admin-api";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CreateAdminUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void | Promise<void>;
};

export function CreateAdminUserDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateAdminUserDialogProps) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<"ADMIN" | "CUSTOMER">("CUSTOMER");
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setEmail("");
    setPassword("");
    setRole("CUSTOMER");
    setPending(false);
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password too short", {
        description: "Use at least 8 characters.",
      });
      return;
    }
    setPending(true);
    try {
      await createAdminManagedUser({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
        role,
      });
      toast.success(
        role === "ADMIN" ? "Admin created" : "User created",
        { description: email.trim().toLowerCase() }
      );
      onOpenChange(false);
      await onCreated();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not create user.";
      toast.error("Create failed", { description: msg });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Create a customer or platform admin account with an initial
            password.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="admin-user-name">Name (optional)</Label>
            <Input
              id="admin-user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-user-email">Email</Label>
            <Input
              id="admin-user-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-user-password">Password</Label>
            <Input
              id="admin-user-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-user-role">Platform role</Label>
            <Select
              value={role}
              onValueChange={(v) =>
                setRole((v as "ADMIN" | "CUSTOMER") ?? "CUSTOMER")
              }
              items={[
                { value: "CUSTOMER", label: "Customer" },
                { value: "ADMIN", label: "Admin" },
              ]}
            >
              <SelectTrigger id="admin-user-role" className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CUSTOMER">Customer</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
