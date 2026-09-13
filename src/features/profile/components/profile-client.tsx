"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  RotateCcw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { ConfirmDestructiveDialog } from "@/features/shared/components/confirm-destructive-dialog";
import { PhoneNumberWithCountryInput } from "@/features/shared/components/phone-number-with-country-input";
import {
  buildE164Phone,
  DEFAULT_PHONE_COUNTRY_ISO2,
  findCountryByIso2,
  splitE164Phone,
} from "@/features/shared/lib/phone-country-prefixes";
import { userDisplayName, userInitials } from "@/lib/user-display";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  changePassword,
  updateProfile,
} from "@/features/profile/lib/profile-api";

function workspaceRoleLabel(role: string): string {
  switch (role) {
    case "OWNER":
      return "Owner";
    case "ADMIN":
      return "Admin";
    default:
      return "Member";
  }
}

async function copyToClipboard(label: string, text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
  }
}

export function ProfileClient() {
  const router = useRouter();
  const { user, workspace, logout, logoutAll, updateUser } = useAuth();

  // Profile fields state
  const [name, setName] = React.useState(user?.name ?? "");
  const initialPhone = React.useMemo(() => {
    if (user?.phone) {
      return splitE164Phone(user.phone);
    }
    return { iso2: DEFAULT_PHONE_COUNTRY_ISO2, localNumber: "" };
  }, [user?.phone]);

  const [countryIso2, setCountryIso2] = React.useState(initialPhone.iso2);
  const [localNumber, setLocalNumber] = React.useState(initialPhone.localNumber);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);

  // Sync state when user profile updates from external source
  React.useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      if (user.phone) {
        const parsed = splitE164Phone(user.phone);
        setCountryIso2(parsed.iso2);
        setLocalNumber(parsed.localNumber);
      } else {
        setCountryIso2(DEFAULT_PHONE_COUNTRY_ISO2);
        setLocalNumber("");
      }
    }
  }, [user]);

  // Compute if profile is dirty
  const isProfileDirty = React.useMemo(() => {
    if (!user) return false;
    const currentName = user.name ?? "";
    const nameChanged = name.trim() !== currentName.trim();

    const prefix = findCountryByIso2(countryIso2)?.dialCode ?? "+880";
    const builtCurrentPhone = localNumber.trim()
      ? buildE164Phone(prefix, localNumber)
      : "";
    const originalPhone = user.phone ?? "";
    const phoneChanged = builtCurrentPhone !== originalPhone;

    return nameChanged || phoneChanged;
  }, [user, name, countryIso2, localNumber]);

  // Password fields state
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSavingPassword, setIsSavingPassword] = React.useState(false);

  // Sign out confirmation dialogs
  const [logoutConfirmOpen, setLogoutConfirmOpen] = React.useState(false);
  const [logoutAllConfirmOpen, setLogoutAllConfirmOpen] = React.useState(false);

  if (!user) {
    return null;
  }

  const hasExistingPassword = user.hasPassword !== false;

  const handleResetProfile = () => {
    setName(user.name ?? "");
    if (user.phone) {
      const parsed = splitE164Phone(user.phone);
      setCountryIso2(parsed.iso2);
      setLocalNumber(parsed.localNumber);
    } else {
      setCountryIso2(DEFAULT_PHONE_COUNTRY_ISO2);
      setLocalNumber("");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProfileDirty) return;

    setIsSavingProfile(true);
    try {
      const prefix = findCountryByIso2(countryIso2)?.dialCode ?? "+880";
      const cleanPhone = localNumber.trim()
        ? buildE164Phone(prefix, localNumber)
        : null;

      const res = await updateProfile({
        name: name.trim() || null,
        phone: cleanPhone,
      });

      updateUser(res.user);
      toast.success("Profile updated", {
        description: "Your account details have been saved successfully.",
      });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not update profile.";
      toast.error("Update failed", { description: msg });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("Password too short", {
        description: "New password must be at least 8 characters long.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match", {
        description: "Please make sure your new passwords match.",
      });
      return;
    }

    if (hasExistingPassword && !currentPassword) {
      toast.error("Current password required", {
        description: "Please enter your current password to set a new one.",
      });
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await changePassword({
        currentPassword: hasExistingPassword ? currentPassword : undefined,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Update user hasPassword state
      updateUser({ ...user, hasPassword: true });

      toast.success("Password updated", {
        description: res.message || "Your password has been changed securely.",
      });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not update password.";
      toast.error("Password change failed", { description: msg });
    } finally {
      setIsSavingPassword(false);
    }
  };

  async function confirmLogout() {
    try {
      await logout();
      toast.success("Signed out", {
        description: "You can sign in again anytime.",
      });
      router.push("/login");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      toast.error("Could not sign out", { description: message });
      throw err;
    }
  }

  async function confirmLogoutAll() {
    try {
      await logoutAll();
      toast.success("Signed out of all sessions", {
        description: "All active sessions have been terminated securely.",
      });
      router.push("/login");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      toast.error("Could not sign out", { description: message });
      throw err;
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-12">
      {/* Top Profile Summary Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/50 to-violet-50/30 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900/80 dark:to-violet-950/20 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar className="size-20 border-2 border-white shadow-md ring-2 ring-violet-500/20 dark:border-slate-800 dark:ring-violet-400/20 sm:size-24">
                <AvatarFallback className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 text-2xl font-bold text-white sm:text-3xl">
                  {userInitials(user)}
                </AvatarFallback>
              </Avatar>
              <span
                className="absolute bottom-0 right-0 flex size-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
                title="Active Account"
              >
                <Check className="size-3 text-white" strokeWidth={3} />
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  {userDisplayName(user)}
                </h1>
                <Badge
                  variant={user.role === "ADMIN" ? "default" : "secondary"}
                  className="rounded-full text-xs font-semibold"
                >
                  {user.role === "ADMIN" ? (
                    <span className="flex items-center gap-1">
                      <Shield className="size-3" />
                      Platform Admin
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <UserCheck className="size-3" />
                      Customer
                    </span>
                  )}
                </Badge>
              </div>

              <p className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                <Mail className="size-3.5 shrink-0" />
                <span>{user.email}</span>
              </p>

              {user.phone ? (
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {user.phone}
                </p>
              ) : (
                <p className="text-xs italic text-slate-400 dark:text-slate-500">
                  No phone number set
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard("User ID", user.id)}
              className="h-9 gap-1.5 rounded-lg text-xs"
              title="Copy internal account identifier"
            >
              <Copy className="size-3.5 text-slate-500" />
              Copy User ID
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left 2 Columns: Edit Profile & Password Form */}
        <div className="space-y-8 lg:col-span-2">
          {/* Card 1: Edit Profile Details */}
          <Card className="rounded-xl border border-border bg-white shadow-xs dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400">
                  <User className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    Personal Information
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Update your display name and contact phone number.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <form onSubmit={handleSaveProfile}>
              <CardContent className="space-y-5 p-6">
                <div className="space-y-2">
                  <Label htmlFor="display-name" className="text-xs font-semibold">
                    Display Name / Full Name
                  </Label>
                  <div className="relative">
                    <Input
                      id="display-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      maxLength={120}
                      className="h-11 rounded-lg pl-3 text-sm shadow-xs"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    This name will appear on messages, team lists, and notifications.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone-local" className="text-xs font-semibold">
                    Phone Number
                  </Label>
                  <PhoneNumberWithCountryInput
                    id="phone-local"
                    countryIso2={countryIso2}
                    onCountryIso2Change={setCountryIso2}
                    localNumber={localNumber}
                    onLocalNumberChange={setLocalNumber}
                    placeholder="e.g. 1712345678"
                    className="h-11 rounded-lg text-sm shadow-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    International format. Select your country code and enter digits without leading zeros.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email" className="text-xs font-semibold">
                      Email Address
                    </Label>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                      <Lock className="size-3" />
                      Primary Login
                    </span>
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="h-11 rounded-lg bg-slate-50 font-mono text-xs text-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Your email address is your permanent account identifier.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/30">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetProfile}
                  disabled={!isProfileDirty || isSavingProfile}
                  className="gap-1.5 text-xs text-slate-600 dark:text-slate-400"
                >
                  <RotateCcw className="size-3.5" />
                  Discard Changes
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={!isProfileDirty || isSavingProfile}
                  className="gap-2 rounded-lg bg-violet-600 px-5 text-xs font-medium text-white shadow-sm hover:bg-violet-700"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="size-3.5" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Card 2: Security & Password */}
          <Card className="rounded-xl border border-border bg-white shadow-xs dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <KeyRound className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    {hasExistingPassword ? "Change Password" : "Set Account Password"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {hasExistingPassword
                      ? "Keep your account secure with a strong password."
                      : "Add a password to sign in directly with email and password."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <form onSubmit={handleSavePassword}>
              <CardContent className="space-y-5 p-6">
                {!hasExistingPassword && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                    <p className="font-semibold">Signed in with Google</p>
                    <p className="mt-0.5 text-[11px] text-amber-800 dark:text-amber-400">
                      You currently sign in via Google OAuth. Setting a password allows you to log in with either Google or your email/password combination.
                    </p>
                  </div>
                )}

                {hasExistingPassword && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="current-password"
                      className="text-xs font-semibold"
                    >
                      Current Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        autoComplete="current-password"
                        className="h-11 rounded-lg pr-10 text-sm shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title={showCurrentPassword ? "Hide password" : "Show password"}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-xs font-semibold">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        className="h-11 rounded-lg pr-10 text-sm shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirm-password"
                      className="text-xs font-semibold"
                    >
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                        className="h-11 rounded-lg pr-10 text-sm shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title={
                          showConfirmPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Must be at least 8 characters. Mix letters, numbers, and symbols for high security.
                  </span>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-end border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/30">
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    !newPassword ||
                    !confirmPassword ||
                    (hasExistingPassword && !currentPassword) ||
                    isSavingPassword
                  }
                  className="gap-2 rounded-lg bg-indigo-600 px-5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
                >
                  {isSavingPassword ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Updating Password…
                    </>
                  ) : (
                    <>
                      <KeyRound className="size-3.5" />
                      {hasExistingPassword ? "Update Password" : "Set Password"}
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Right 1 Column: Workspace, Account info & Sessions */}
        <div className="space-y-8">
          {/* Workspace Information */}
          {workspace ? (
            <Card className="rounded-xl border border-border bg-white shadow-xs dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                    <Building2 className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Organization
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Active workspace for this session.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-50">
                        {workspace.name}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {workspace.slug}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {workspaceRoleLabel(workspace.role)}
                    </Badge>
                  </div>
                </div>

                <Link
                  href="/billing"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "inline-flex w-full items-center justify-center gap-2 rounded-lg text-xs"
                  )}
                >
                  <CreditCard className="size-4" />
                  Plans & Billing
                </Link>
              </CardContent>
            </Card>
          ) : null}

          {/* Sessions & Security Actions */}
          <Card className="rounded-xl border border-red-200/60 bg-white shadow-xs dark:border-red-950/50 dark:bg-slate-950">
            <CardHeader className="border-b border-red-100/60 bg-red-50/40 dark:border-red-950/40 dark:bg-red-950/20">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-400">
                  <ShieldAlert className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
                    Session & Sign Out
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Manage active sign-in sessions.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                onClick={() => setLogoutConfirmOpen(true)}
              >
                <LogOut className="size-4 text-slate-500" />
                Sign out of this browser
              </Button>

              <Button
                type="button"
                variant="destructive"
                className="w-full justify-start gap-2 rounded-lg text-xs"
                onClick={() => setLogoutAllConfirmOpen(true)}
              >
                <ShieldAlert className="size-4" />
                Sign out of all devices
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog: Logout Single Session */}
      <ConfirmDestructiveDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        title="Sign out?"
        description="You will need to sign in again to access this workspace on this browser."
        confirmLabel="Sign out"
        destructive={false}
        onConfirm={confirmLogout}
      />

      {/* Confirmation Dialog: Logout All Sessions */}
      <ConfirmDestructiveDialog
        open={logoutAllConfirmOpen}
        onOpenChange={setLogoutAllConfirmOpen}
        title="Sign out of all sessions?"
        description="This will immediately invalidate all active sessions and refresh tokens on all devices and browsers."
        confirmLabel="Sign out everywhere"
        destructive={true}
        onConfirm={confirmLogoutAll}
      />
    </div>
  );
}
