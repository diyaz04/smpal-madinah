import { useState } from "react";
import { Download } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { usePwaInstall, isIOSDevice } from "@/hooks/usePwaInstall";
import { IosInstallDialog } from "./IosInstallDialog";

export function InstallMenuItem() {
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const [iosDialogOpen, setIosDialogOpen] = useState(false);
  const isIOS = isIOSDevice();

  if (installed || (!canInstall && !isIOS)) return null;

  return (
    <>
      <DropdownMenuItem onClick={() => (isIOS ? setIosDialogOpen(true) : promptInstall())}>
        <Download /> Instal Aplikasi
      </DropdownMenuItem>
      <IosInstallDialog open={iosDialogOpen} onOpenChange={setIosDialogOpen} />
    </>
  );
}
