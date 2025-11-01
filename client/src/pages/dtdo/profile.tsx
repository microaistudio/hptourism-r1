import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Loader2,
  Key,
  Save,
} from "lucide-react";
import type { User as UserType } from "@shared/schema";

export default function DTDOProfilePage() {
  const { toast } = useToast();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const { data: userData, isLoading } = useQuery<{ user: UserType }>({
    queryKey: ["/api/auth/me"],
  });

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    mobile: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { fullName: string; email?: string }) => {
      const response = await apiRequest("PATCH", "/api/auth/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditingProfile(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/auth/change-password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully.",
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setIsChangingPassword(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const user = userData?.user;
  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">User not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleEditProfile = () => {
    setProfileForm({
      fullName: user.fullName,
      email: user.email || "",
      mobile: user.mobile,
    });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = () => {
    if (!profileForm.fullName.trim()) {
      toast({
        title: "Validation Error",
        description: "Full name is required",
        variant: "destructive",
      });
      return;
    }

    updateProfileMutation.mutate({
      fullName: profileForm.fullName,
      email: profileForm.email || undefined,
    });
  };

  const handleChangePassword = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "All password fields are required",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; className: string }> = {
      district_tourism_officer: {
        label: "District Tourism Development Officer",
        className: "bg-blue-50 text-blue-700 dark:bg-blue-950/20",
      },
      district_officer: {
        label: "District Officer",
        className: "bg-purple-50 text-purple-700 dark:bg-purple-950/20",
      },
    };

    const config = roleConfig[role] || { label: role, className: "" };
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your profile information
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Your personal details and role information</CardDescription>
            </div>
            {!isEditingProfile && (
              <Button
                onClick={handleEditProfile}
                variant="outline"
                data-testid="button-edit-profile"
              >
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isEditingProfile ? (
            <>
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Full Name</div>
                    <div className="font-medium">{user.fullName}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Mobile</div>
                    <div className="font-medium">{user.mobile}</div>
                  </div>
                </div>

                {user.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <div className="font-medium">{user.email}</div>
                    </div>
                  </div>
                )}

                {user.district && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Assigned District</div>
                      <div className="font-medium">{user.district}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Role</div>
                    <div className="mt-1">{getRoleBadge(user.role)}</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  placeholder="Enter your full name"
                  data-testid="input-fullname"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile (Cannot be changed)</Label>
                <Input
                  id="mobile"
                  value={profileForm.mobile}
                  disabled
                  className="bg-muted"
                  data-testid="input-mobile"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="Enter your email"
                  data-testid="input-email"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditingProfile(false)}
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isChangingPassword ? (
            <Button
              onClick={() => setIsChangingPassword(true)}
              variant="outline"
              data-testid="button-change-password"
            >
              Change Password
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  placeholder="Enter current password"
                  data-testid="input-current-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  placeholder="Enter new password"
                  data-testid="input-new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  placeholder="Confirm new password"
                  data-testid="input-confirm-password"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={changePasswordMutation.isPending}
                  data-testid="button-submit-password"
                >
                  {changePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  }}
                  disabled={changePasswordMutation.isPending}
                  data-testid="button-cancel-password"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
