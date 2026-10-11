import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload, UserRound } from "lucide-react";
import { toast } from "sonner";

import { updateProfileSchema, type UpdateProfileInput } from "@shared/schemas/profile.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useSession } from "@/hooks/useSession";
import { useUpdateProfile, useUploadProfilePhoto } from "@/hooks/useProfileMutations";
import { compressImage } from "@/lib/imageCompress";
import { ApiError } from "@/lib/api";

export function InfoTab() {
  const { data: session } = useSession();
  const updateProfile = useUpdateProfile();
  const uploadPhoto = useUploadProfilePhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    values: {
      fullName: session?.user.fullName ?? "",
      email: session?.user.email ?? "",
      phone: session?.user.phone ?? "",
    },
  });

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const compressed = await compressImage(file, { maxDimension: 512, targetBytes: 150 * 1024, square: true });
    uploadPhoto.mutate(compressed, {
      onSuccess: () => toast.success("Foto profil diperbarui."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal mengunggah foto."),
    });
  }

  function onSubmit(values: UpdateProfileInput) {
    updateProfile.mutate(values, {
      onSuccess: () => toast.success("Profil berhasil disimpan."),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
    });
  }

  const photoUrl = session?.user.photoFileId ? `/api/files/${session.user.photoFileId}` : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={photoUrl} />
          <AvatarFallback>
            <UserRound className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploadPhoto.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadPhoto.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
          Ganti Foto
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handlePhotoChange}
        />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Lengkap</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>No. HP</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={updateProfile.isPending}>
            {updateProfile.isPending && <Loader2 className="animate-spin" />}
            Simpan Perubahan
          </Button>
        </form>
      </Form>
    </div>
  );
}
