import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload, School } from "lucide-react";
import { toast } from "sonner";

import { updateSettingsSchema, type UpdateSettingsInput } from "@shared/schemas/settings.schema";
import { THEME_COLOR_PRESETS } from "@shared/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  useSettingsQuery,
  useUpdateSettings,
  useUploadLogo,
  useUploadLetterhead,
} from "@/hooks/useSettings";
import { usePermission } from "@/hooks/usePermission";
import { compressImage } from "@/lib/imageCompress";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

function FileUploadBox({
  label,
  imageUrl,
  onUpload,
  isUploading,
  disabled,
}: {
  label: string;
  imageUrl: string | null;
  onUpload: (file: File) => void;
  isUploading: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const compressed = await compressImage(file, { maxDimension: 1280, targetBytes: 200 * 1024 });
    onUpload(compressed);
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
          {imageUrl ? (
            <img src={imageUrl} alt={label} className="h-full w-full object-contain" />
          ) : (
            <School className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
          Unggah
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}

export function SchoolSettingsPage() {
  const { can } = usePermission();
  const canEdit = can("pengaturan_sekolah", "ubah");
  const { data, isLoading } = useSettingsQuery();
  const updateSettings = useUpdateSettings();
  const uploadLogo = useUploadLogo();
  const uploadLetterhead = useUploadLetterhead();
  const [color, setColor] = useState("#4f46e5");

  const form = useForm<UpdateSettingsInput>({
    resolver: zodResolver(updateSettingsSchema),
    defaultValues: {
      schoolProfile: {
        nama: "",
        npsn: "",
        alamat: "",
        kecamatan: "",
        kabupaten_kota: "",
        provinsi: "",
        telepon: "",
        email: "",
        website: "",
        kepala_sekolah_nama: "",
        kepala_sekolah_nip: "",
      },
      defaultPrimaryColor: "#4f46e5",
    },
  });

  useEffect(() => {
    if (data) {
      form.reset({ schoolProfile: data.schoolProfile, defaultPrimaryColor: data.defaultPrimaryColor });
      setColor(data.defaultPrimaryColor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function onSubmit(values: UpdateSettingsInput) {
    updateSettings.mutate(values, {
      onSuccess: () => toast.success("Pengaturan sekolah berhasil disimpan."),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
    });
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Pengaturan Sekolah</h1>

      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <FileUploadBox
          label="Logo Sekolah"
          imageUrl={data?.logoUrl ?? null}
          onUpload={(file) => uploadLogo.mutate(file, { onSuccess: () => toast.success("Logo diperbarui.") })}
          isUploading={uploadLogo.isPending}
          disabled={!canEdit}
        />
        <FileUploadBox
          label="Kop Surat"
          imageUrl={data?.kopUrl ?? null}
          onUpload={(file) =>
            uploadLetterhead.mutate(file, { onSuccess: () => toast.success("Kop surat diperbarui.") })
          }
          isUploading={uploadLetterhead.isPending}
          disabled={!canEdit}
        />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="font-medium text-foreground">Profil Sekolah</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="schoolProfile.nama"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nama Sekolah</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEdit} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="schoolProfile.npsn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NPSN</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEdit} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="schoolProfile.telepon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telepon</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEdit} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="schoolProfile.alamat"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Alamat</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEdit} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="schoolProfile.kecamatan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kecamatan</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEdit} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="schoolProfile.kabupaten_kota"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kabupaten/Kota</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEdit} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="schoolProfile.provinsi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provinsi</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEdit} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="schoolProfile.email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} disabled={!canEdit} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="schoolProfile.website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEdit} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="schoolProfile.kepala_sekolah_nama"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kepala Sekolah</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEdit} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="schoolProfile.kepala_sekolah_nip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIP Kepala Sekolah</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEdit} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-card p-5">
            <h2 className="font-medium text-foreground">Warna Utama Default</h2>
            <p className="text-sm text-muted-foreground">
              Dipakai untuk halaman login dan user yang belum memilih warnanya sendiri.
            </p>
            <div className="flex flex-wrap gap-3">
              {THEME_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  disabled={!canEdit}
                  title={preset.name}
                  onClick={() => {
                    setColor(preset.hex);
                    form.setValue("defaultPrimaryColor", preset.hex, { shouldDirty: true });
                  }}
                  className={cn(
                    "h-9 w-9 rounded-full ring-offset-2",
                    color.toLowerCase() === preset.hex.toLowerCase() && "ring-2 ring-foreground",
                  )}
                  style={{ backgroundColor: preset.hex }}
                />
              ))}
              <input
                type="color"
                disabled={!canEdit}
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  form.setValue("defaultPrimaryColor", e.target.value, { shouldDirty: true });
                }}
                className="h-9 w-9 cursor-pointer rounded-full border border-border bg-transparent p-0.5"
              />
            </div>
          </div>

          {canEdit && (
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending && <Loader2 className="animate-spin" />}
              Simpan Pengaturan
            </Button>
          )}
        </form>
      </Form>
    </div>
  );
}
