import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { createMapelSchema, type CreateMapelInput } from "@shared/schemas/mapel.schema";
import { TINGKAT_LIST, MAPEL_JENIS_LIST, MAPEL_JENIS_LABELS } from "@shared/constants";
import type { MapelListItem } from "@shared/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCreateMapel, useUpdateMapel } from "@/hooks/useMapel";
import { ApiError } from "@/lib/api";

interface MapelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapel?: MapelListItem;
  indukOptions: MapelListItem[];
}

const NONE_VALUE = "__none__";
const DEFAULT_PREDIKAT: CreateMapelInput["predikatConfig"] = [
  { batasBawah: 0, label: "Cukup Baik" },
  { batasBawah: 75, label: "Baik" },
  { batasBawah: 90, label: "Sangat Baik" },
];

export function MapelFormDialog({ open, onOpenChange, mapel, indukOptions }: MapelFormDialogProps) {
  const isEdit = !!mapel;
  const createMapel = useCreateMapel();
  const updateMapel = useUpdateMapel(mapel?.id ?? "");
  const mutation = isEdit ? updateMapel : createMapel;

  const form = useForm<CreateMapelInput>({
    resolver: zodResolver(createMapelSchema),
    defaultValues: {
      nama: "",
      kodeJadwal: "",
      aliasKode: [],
      jenis: "akademik",
      indukMapelId: null,
      tampilRaport: true,
      tingkatBerlaku: ["VII", "VIII", "IX"],
      predikatConfig: DEFAULT_PREDIKAT,
      isActive: true,
    },
  });

  const predikatArray = useFieldArray({ control: form.control, name: "predikatConfig" });

  useEffect(() => {
    if (open) {
      form.reset({
        nama: mapel?.nama ?? "",
        kodeJadwal: mapel?.kodeJadwal ?? "",
        aliasKode: mapel?.aliasKode ?? [],
        jenis: mapel?.jenis ?? "akademik",
        indukMapelId: mapel?.indukMapelId ?? null,
        tampilRaport: mapel?.tampilRaport ?? true,
        tingkatBerlaku: mapel?.tingkatBerlaku ?? ["VII", "VIII", "IX"],
        predikatConfig: mapel?.predikatConfig ?? DEFAULT_PREDIKAT,
        isActive: mapel?.isActive ?? true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mapel?.id]);

  function onSubmit(values: CreateMapelInput) {
    const onError = (err: unknown) =>
      toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan mapel.");
    const onSuccess = () => {
      toast.success(isEdit ? "Mapel berhasil diperbarui." : "Mapel berhasil dibuat.");
      onOpenChange(false);
    };
    if (isEdit) updateMapel.mutate(values, { onSuccess, onError });
    else createMapel.mutate(values, { onSuccess, onError });
  }

  const availableInduk = indukOptions.filter((m) => m.id !== mapel?.id && !m.indukMapelId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Mata Pelajaran" : "Tambah Mata Pelajaran"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="nama"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nama Mapel</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Matematika" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kodeJadwal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode Jadwal</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Mate" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jenis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jenis</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MAPEL_JENIS_LIST.map((j) => (
                          <SelectItem key={j} value={j}>
                            {MAPEL_JENIS_LABELS[j]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="aliasKode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alias Kode (untuk impor jadwal)</FormLabel>
                  <FormControl>
                    <Input
                      value={field.value.join(", ")}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        )
                      }
                      placeholder="Mtk, MTK (pisahkan dengan koma)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="indukMapelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Induk Mapel (opsional)</FormLabel>
                  <Select
                    value={field.value ?? NONE_VALUE}
                    onValueChange={(v) => field.onChange(v === NONE_VALUE ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Tidak ada" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Tidak ada</SelectItem>
                      {availableInduk.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tingkatBerlaku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Berlaku untuk Tingkat</FormLabel>
                  <div className="flex gap-4">
                    {TINGKAT_LIST.map((t) => (
                      <label key={t} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={field.value.includes(t)}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked ? [...field.value, t] : field.value.filter((v) => v !== t),
                            )
                          }
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <FormField
                control={form.control}
                name="tampilRaport"
                render={({ field }) => (
                  <FormItem className="flex flex-1 items-center justify-between gap-2">
                    <FormLabel className="font-normal">Tampil di Raport</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-1 items-center justify-between gap-2">
                    <FormLabel className="font-normal">Aktif</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Rentang Predikat</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    predikatArray.append({ batasBawah: 0, label: "" })
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah
                </Button>
              </div>
              {predikatArray.fields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`predikatConfig.${i}.batasBawah`}
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`predikatConfig.${i}.label`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input {...field} placeholder="Label predikat" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => predikatArray.remove(i)}
                    disabled={predikatArray.fields.length <= 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {form.formState.errors.predikatConfig?.root && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.predikatConfig.root.message}
                </p>
              )}
              {form.formState.errors.predikatConfig?.message && (
                <p className="text-sm text-destructive">{form.formState.errors.predikatConfig.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
