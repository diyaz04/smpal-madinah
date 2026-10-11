import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { THEME_COLOR_PRESETS, DEFAULT_PRIMARY_COLOR } from "@shared/constants";
import { useSession } from "@/hooks/useSession";
import { useUpdateTheme } from "@/hooks/useProfileMutations";
import { applyTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";

export function ThemeTab() {
  const { data: session } = useSession();
  const savedColor = session?.user.primaryColor ?? session?.defaultPrimaryColor ?? DEFAULT_PRIMARY_COLOR;
  const [draftColor, setDraftColor] = useState(savedColor);
  const updateTheme = useUpdateTheme();

  const isDirty = draftColor.toLowerCase() !== savedColor.toLowerCase();

  function preview(hex: string) {
    setDraftColor(hex);
    applyTheme(hex); // preview langsung, belum disimpan ke server
  }

  function handleSave() {
    updateTheme.mutate(
      { primaryColor: draftColor },
      {
        onSuccess: () => toast.success("Warna utama berhasil disimpan."),
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan warna.");
          applyTheme(savedColor);
          setDraftColor(savedColor);
        },
      },
    );
  }

  function handleCancel() {
    setDraftColor(savedColor);
    applyTheme(savedColor);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Warna preset</p>
        <div className="flex flex-wrap gap-3">
          {THEME_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.hex}
              type="button"
              title={preset.name}
              onClick={() => preview(preset.hex)}
              className="flex h-10 w-10 items-center justify-center rounded-full ring-offset-2 transition-transform hover:scale-105"
              style={{ backgroundColor: preset.hex, outline: "1px solid rgba(0,0,0,0.06)" }}
            >
              {draftColor.toLowerCase() === preset.hex.toLowerCase() && (
                <Check className="h-4 w-4" style={{ color: "#ffffff" }} />
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Warna bebas</p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={draftColor}
            onChange={(e) => preview(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent p-1"
            aria-label="Pilih warna bebas"
          />
          <span className="text-sm text-muted-foreground">{draftColor}</span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Preview</p>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Button>Tombol Utama</Button>
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            Badge contoh
          </span>
        </div>
      </div>

      <div className={cn("flex gap-2", !isDirty && "opacity-0 pointer-events-none")}>
        <Button onClick={handleSave} disabled={updateTheme.isPending}>
          {updateTheme.isPending && <Loader2 className="animate-spin" />}
          Simpan Warna
        </Button>
        <Button variant="outline" onClick={handleCancel} disabled={updateTheme.isPending}>
          Batal
        </Button>
      </div>
    </div>
  );
}
