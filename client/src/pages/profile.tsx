import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserProfileSchema, type UserProfile } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Save, User } from "lucide-react";
import type { User as UserType } from "@shared/schema";
import { 
  getDistricts, 
  getTehsilsForDistrict, 
  getBlocksForTehsil, 
  getUrbanBodiesForDistrict, 
  getWardsForUrbanBody 
} from "@shared/lgd-data";

export default function ProfilePage() {
  const { toast } = useToast();
  
  // Fetch current user
  const { data: userData } = useQuery<{ user: UserType }>({
    queryKey: ['/api/auth/me'],
  });
  
  const user = userData?.user;

  // Fetch existing profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery<UserProfile>({
    queryKey: ['/api/profile'],
    enabled: !!user,
    retry: false,
  });

  // Form with default values from profile or user
  const form = useForm({
    resolver: zodResolver(insertUserProfileSchema),
    defaultValues: {
      fullName: profile?.fullName || user?.fullName || "",
      gender: profile?.gender || "male",
      aadhaarNumber: profile?.aadhaarNumber || user?.aadhaarNumber || "",
      mobile: profile?.mobile || user?.mobile || "",
      email: profile?.email || user?.email || "",
      district: profile?.district || user?.district || "",
      tehsil: profile?.tehsil || "",
      block: profile?.block || "",
      gramPanchayat: profile?.gramPanchayat || "",
      urbanBody: profile?.urbanBody || "",
      ward: profile?.ward || "",
      address: profile?.address || "",
      pincode: profile?.pincode || "",
      telephone: profile?.telephone || "",
      fax: profile?.fax || "",
    },
  });

  // Reset form when profile data is loaded
  if (profile && !form.formState.isDirty) {
    form.reset({
      fullName: profile.fullName,
      gender: profile.gender as "male" | "female" | "other",
      aadhaarNumber: profile.aadhaarNumber || "",
      mobile: profile.mobile,
      email: profile.email || "",
      district: profile.district || "",
      tehsil: profile.tehsil || "",
      block: profile.block || "",
      gramPanchayat: profile.gramPanchayat || "",
      urbanBody: profile.urbanBody || "",
      ward: profile.ward || "",
      address: profile.address || "",
      pincode: profile.pincode || "",
      telephone: profile.telephone || "",
      fax: profile.fax || "",
    });
  }

  // Save/Update profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      toast({
        title: "Profile saved successfully",
        description: "Your profile information has been updated. This will be used to auto-fill future applications.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to save profile",
        description: error.message || "Please try again.",
      });
    },
  });

  const onSubmit = (data: any) => {
    saveProfileMutation.mutate(data);
  };

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <User className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">My Profile</h1>
        </div>
        <p className="text-muted-foreground">
          Save your default information here to auto-fill future homestay registration applications. 
          You can always override these values when filling out an application.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Your basic personal details that will be used across all applications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Enter your full name as per official documents"
                        data-testid="input-profile-fullname"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-profile-gender">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Female property owners receive an additional 5% discount on registration fees
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="aadhaarNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhaar Number</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="123456789012" 
                          maxLength={12}
                          data-testid="input-profile-aadhaar"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="9876543210" 
                          maxLength={10}
                          data-testid="input-profile-mobile"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="email" 
                        placeholder="your.email@example.com"
                        data-testid="input-profile-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
              <CardDescription>
                Your contact address details (LGD hierarchical format)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>District</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset dependent fields when district changes
                          form.setValue('tehsil', '');
                          form.setValue('block', '');
                          form.setValue('gramPanchayat', '');
                          form.setValue('urbanBody', '');
                          form.setValue('ward', '');
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-profile-district">
                            <SelectValue placeholder="Select district" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getDistricts().map((district) => (
                            <SelectItem key={district} value={district}>
                              {district}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Select your district first</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tehsil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tehsil / Sub-Division</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset block/GP when tehsil changes
                          form.setValue('block', '');
                          form.setValue('gramPanchayat', '');
                        }} 
                        value={field.value}
                        disabled={!form.watch('district')}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-profile-tehsil">
                            <SelectValue placeholder="Select tehsil" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getTehsilsForDistrict(form.watch('district')).map((tehsil) => (
                            <SelectItem key={tehsil} value={tehsil}>
                              {tehsil}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Select tehsil after district</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="block"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Block (for rural areas)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!form.watch('tehsil')}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-profile-block">
                            <SelectValue placeholder="Select block" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getBlocksForTehsil(form.watch('district'), form.watch('tehsil')).map((block) => (
                            <SelectItem key={block} value={block}>
                              {block}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Rural development block</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gramPanchayat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gram Panchayat / Village (for rural areas)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Enter Gram Panchayat name"
                          data-testid="input-profile-gp"
                          disabled={!form.watch('block')}
                        />
                      </FormControl>
                      <FormDescription>Enter the specific GP/village name</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="urbanBody"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Urban Body / MC / TCP (for urban areas)</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset ward when urban body changes
                          form.setValue('ward', '');
                        }} 
                        value={field.value}
                        disabled={!form.watch('district')}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-profile-urban-body">
                            <SelectValue placeholder="Select urban body" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getUrbanBodiesForDistrict(form.watch('district')).map((ub) => (
                            <SelectItem key={ub.name} value={ub.name}>
                              {ub.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Municipal Corporation or Town & Country Planning</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ward"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ward / Zone (for urban areas)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!form.watch('urbanBody')}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-profile-ward">
                            <SelectValue placeholder="Select ward" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getWardsForUrbanBody(form.watch('district'), form.watch('urbanBody')).map((ward) => (
                            <SelectItem key={ward} value={ward}>
                              {ward}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Ward number in the selected urban body</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="House/Building number, Street, Locality"
                        rows={3}
                        data-testid="input-profile-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="171001" 
                          maxLength={6}
                          data-testid="input-profile-pincode"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telephone (Landline)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="0177-2812345"
                          data-testid="input-profile-telephone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fax Number</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="0177-2812346"
                          data-testid="input-profile-fax"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button
              type="submit"
              disabled={saveProfileMutation.isPending || !form.formState.isDirty}
              data-testid="button-save-profile"
            >
              {saveProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
