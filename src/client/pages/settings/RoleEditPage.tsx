import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { MODULES, MODULE_GROUPS_ORDER } from "@shared/modules";
import {
  PERMISSION_ACTIONS,
  PERMISSION_ACTION_LABELS,
  PERMISSION_SCOPES,
  PERMISSION_SCOPE_LABELS,
  type PermissionAction,
  type PermissionScope,
} from "@shared/constants";
import type { PermissionEntry } from "@shared/schemas/role.schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoleDetail } from "@/hooks/useRoles";
import { useUpdateRolePermissions } from "@/hooks/useRoleMutations";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

type RowState = { actions: Record<PermissionAction, boolean>; scope: PermissionScope };
type MatrixState = Record<string, RowState>;

function emptyRow(): RowState {
  return {
    actions: Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a, false])) as Record<
      PermissionAction,
      boolean
    >,
    scope: "semua",
  };
}

function buildMatrixFromPermissions(permissions: PermissionEntry[]): MatrixState {
  const matrix: MatrixState = {};
  for (const mod of MODULES) matrix[mod.key] = emptyRow();
  for (const p of permissions) {
    const row = matrix[p.moduleKey];
    if (!row) continue;
    row.actions[p.action] = true;
    if (row.scope === "semua" && p.scope === "milik_sendiri") row.scope = p.scope;
    // kalau ada kombinasi scope campur per modul, scope "semua" dari aksi lain tetap menang
    // di tampilan (lihat DECISIONS.md) — penyimpanan tetap per aksi lewat matrixToPermissions().
  }
  return matrix;
}

function matrixToPermissions(matrix: MatrixState): PermissionEntry[] {
  const result: PermissionEntry[] = [];
  for (const [moduleKey, row] of Object.entries(matrix)) {
    for (const action of PERMISSION_ACTIONS) {
      if (row.actions[action]) {
        result.push({ moduleKey, action, scope: row.scope });
      }
    }
  }
  return result;
}

export function RoleEditPage() {
  const { roleId } = useParams<{ roleId: string }>();
  const { data, isLoading } = useRoleDetail(roleId);
  const updatePermissions = useUpdateRolePermissions(roleId ?? "");

  const [matrix, setMatrix] = useState<MatrixState | null>(null);

  useEffect(() => {
    if (data?.role) {
      setMatrix(buildMatrixFromPermissions(data.role.permissions));
    }
  }, [data?.role]);

  const groupedModules = useMemo(
    () =>
      MODULE_GROUPS_ORDER.map((group) => ({
        group,
        modules: MODULES.filter((m) => m.grup === group),
      })).filter((g) => g.modules.length > 0),
    [],
  );

  const role = data?.role;
  const isLocked = role?.isLocked ?? false;

  function toggleCell(moduleKey: string, action: PermissionAction, checked: boolean) {
    if (isLocked) return;
    setMatrix((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [moduleKey]: {
          ...prev[moduleKey]!,
          actions: { ...prev[moduleKey]!.actions, [action]: checked },
        },
      };
    });
  }

  function setScope(moduleKey: string, scope: PermissionScope) {
    if (isLocked) return;
    setMatrix((prev) => (prev ? { ...prev, [moduleKey]: { ...prev[moduleKey]!, scope } } : prev));
  }

  function toggleRowAll(moduleKey: string, availableActions: PermissionAction[]) {
    if (isLocked) return;
    setMatrix((prev) => {
      if (!prev) return prev;
      const row = prev[moduleKey]!;
      const allChecked = availableActions.every((a) => row.actions[a]);
      const nextActions = { ...row.actions };
      for (const a of availableActions) nextActions[a] = !allChecked;
      return { ...prev, [moduleKey]: { ...row, actions: nextActions } };
    });
  }

  function toggleColumnAll(action: PermissionAction) {
    if (isLocked) return;
    setMatrix((prev) => {
      if (!prev) return prev;
      const applicableModules = MODULES.filter((m) => m.aksi.includes(action));
      const allChecked = applicableModules.every((m) => prev[m.key]!.actions[action]);
      const next: MatrixState = { ...prev };
      for (const m of applicableModules) {
        next[m.key] = { ...next[m.key]!, actions: { ...next[m.key]!.actions, [action]: !allChecked } };
      }
      return next;
    });
  }

  function handleSave() {
    if (!matrix || !roleId) return;
    updatePermissions.mutate(
      { permissions: matrixToPermissions(matrix) },
      {
        onSuccess: () => toast.success("Hak akses berhasil disimpan."),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
      },
    );
  }

  if (isLoading || !matrix) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!role) {
    return <p className="text-sm text-muted-foreground">Role tidak ditemukan.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/pengaturan/fitur"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Manajemen Fitur
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-foreground">
            {role.name}
            {isLocked && (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" /> Terkunci
              </Badge>
            )}
          </h1>
        </div>
        {!isLocked && (
          <Button onClick={handleSave} disabled={updatePermissions.isPending}>
            {updatePermissions.isPending && <Loader2 className="animate-spin" />}
            Simpan Hak Akses
          </Button>
        )}
      </div>

      {isLocked && (
        <p className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
          Role Admin dikunci sistem — tidak bisa diedit, dihapus, atau dikurangi izinnya.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="sticky left-0 bg-muted px-4 py-2 text-left font-medium text-foreground">
                Modul
              </th>
              {PERMISSION_ACTIONS.map((action) => (
                <th key={action} className="px-3 py-2 text-center font-medium text-foreground">
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => toggleColumnAll(action)}
                    className="hover:underline disabled:cursor-not-allowed disabled:no-underline"
                  >
                    {PERMISSION_ACTION_LABELS[action]}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2 text-left font-medium text-foreground">Cakupan</th>
            </tr>
          </thead>
          <tbody>
            {groupedModules.map(({ group, modules }) => (
              <Fragment key={group}>
                <tr className="bg-muted/50">
                  <td colSpan={PERMISSION_ACTIONS.length + 2} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group}
                  </td>
                </tr>
                {modules.map((mod) => {
                  const row = matrix[mod.key]!;
                  const anyChecked = PERMISSION_ACTIONS.some((a) => row.actions[a]);
                  return (
                    <tr key={mod.key} className="border-t border-border">
                      <td className="sticky left-0 bg-card px-4 py-2">
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => toggleRowAll(mod.key, mod.aksi)}
                          className="text-left hover:underline disabled:cursor-not-allowed disabled:no-underline"
                        >
                          {mod.nama}
                        </button>
                        {!mod.implemented && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Segera hadir
                          </Badge>
                        )}
                      </td>
                      {PERMISSION_ACTIONS.map((action) => {
                        const available = mod.aksi.includes(action);
                        return (
                          <td key={action} className="px-3 py-2 text-center">
                            {available ? (
                              <Checkbox
                                checked={row.actions[action]}
                                disabled={isLocked}
                                onCheckedChange={(checked) =>
                                  toggleCell(mod.key, action, checked === true)
                                }
                              />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2">
                        <Select
                          value={row.scope}
                          onValueChange={(v) => setScope(mod.key, v as PermissionScope)}
                          disabled={isLocked || !anyChecked}
                        >
                          <SelectTrigger className={cn("h-8 w-36", !anyChecked && "opacity-50")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PERMISSION_SCOPES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {PERMISSION_SCOPE_LABELS[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {!isLocked && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updatePermissions.isPending}>
            {updatePermissions.isPending && <Loader2 className="animate-spin" />}
            Simpan Hak Akses
          </Button>
        </div>
      )}
    </div>
  );
}
