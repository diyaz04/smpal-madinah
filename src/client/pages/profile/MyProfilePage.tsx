import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeTab } from "@/components/profile/ThemeTab";
import { InfoTab } from "@/components/profile/InfoTab";
import { KeamananTab } from "@/components/profile/KeamananTab";
import { PresensiTab } from "@/components/profile/PresensiTab";
import { useSession } from "@/hooks/useSession";

export function MyProfilePage() {
  const { data } = useSession();
  const punyaGuru = !!data?.user.guruId;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-foreground">Profil Saya</h1>
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="keamanan">Keamanan</TabsTrigger>
          {punyaGuru && <TabsTrigger value="presensi">Presensi</TabsTrigger>}
          <TabsTrigger value="tampilan">Tampilan</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="pt-4">
          <InfoTab />
        </TabsContent>
        <TabsContent value="keamanan" className="pt-4">
          <KeamananTab />
        </TabsContent>
        {punyaGuru && (
          <TabsContent value="presensi" className="pt-4">
            <PresensiTab />
          </TabsContent>
        )}
        <TabsContent value="tampilan" className="pt-4">
          <ThemeTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
