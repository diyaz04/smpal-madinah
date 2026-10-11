import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createAcademicPeriodSchema,
  type CreateAcademicPeriodInput,
} from "@shared/schemas/academicPeriod.schema";
import { SEMESTERS, SEMESTER_LABELS } from "@shared/constants";
import type { AcademicPeriodListItem } from "@shared/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useCreateAcademicPeriod, useUpdateAcademicPeriod } from "@/hooks/useAcademicPeriods";
import { ApiError } from "@/lib/api";

interface AcademicPeriodFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period?: AcademicPeriodListItem;
}

export function AcademicPeriodFormDialog({ open, onOpenChange, period }: AcademicPeriodFormDialogProps) {
  const isEdit = !!period;
  const createPeriod = useCreateAcademicPeriod();
  const updatePeriod = useUpdateAcademicPeriod(period?.id ?? "");
  const mutation = isEdit ? updatePeriod : createPeriod;

  const form = useForm<CreateAcademicPeriodInput>({
    resolver: zodResolver(createAcademicPeriodSchema),
    defaultValues: { yearLabel: "", semester: "GANJIL", startDate: "", endDate: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        yearLabel: period?.yearLabel ?? "",
        semester: period?.semester ?? "GANJIL",
        startDate: period?.startDate ?? "",
        endDate: period?.endDate ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, period?.id]);

  function onSubmit(values: CreateAcademicPeriodInput) {
    const onError = (err: unknown) =>
      toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan periode.");
    const onSuccess = () => {
      toast.success(isEdit ? "Periode berhasil diperbarui." : "Periode berhasil dibuat.");
      onOpenChange(false);
    };
    if (isEdit) updatePeriod.mutate(values, { onSuccess, onError });
    else createPeriod.mutate(values, { onSuccess, onError });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Tahun Ajaran" : "Tambah Tahun Ajaran"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="yearLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tahun Ajaran</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="2026/2027" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="semester"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Semester</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SEMESTERS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {SEMESTER_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Mulai</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Selesai</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
