"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LockKey } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { ErrorBanner } from "@/components/layout/error-banner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createRetentionPolicy,
  listRetentionPolicies,
} from "@/services/retention.service";
import { toast } from "sonner";

export default function AdminConservationPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["retention-policies"],
    queryFn: listRetentionPolicies,
  });
  const [name, setName] = useState("");
  const [years, setYears] = useState("10");
  const [classification, setClassification] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <PageFrame>
      <PageHeader
        title="Politiques de conservation"
        description="Durées de conservation par classification. Le legal hold se pose sur la fiche document."
        icon={<LockKey className="h-6 w-6" />}
      />
      {isError && (
        <ErrorBanner
          message={
            error instanceof Error ? error.message : "Chargement impossible"
          }
        />
      )}
      <PagePanel
        title="Politiques"
        subtitle={
          isLoading ? "Chargement…" : `${data?.length ?? 0} politique(s)`
        }
      >
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Classification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.duration_years} an(s)</TableCell>
                  <TableCell>{p.classification || "Toutes"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PagePanel>
      <PagePanel title="Nouvelle politique">
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              await createRetentionPolicy({
                name: name.trim(),
                duration_years: Number(years),
                classification: classification || undefined,
              });
              setName("");
              toast.success("Politique créée");
              await queryClient.invalidateQueries({
                queryKey: ["retention-policies"],
              });
            } catch {
              toast.error("Création impossible");
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="polName">Nom</Label>
            <Input
              id="polName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="polYears">Durée (années)</Label>
            <Input
              id="polYears"
              type="number"
              min={1}
              max={100}
              value={years}
              onChange={(e) => setYears(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="polClass">Classification</Label>
            <Select
              id="polClass"
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
            >
              <option value="">Toutes</option>
              <option value="PUBLIC">PUBLIC</option>
              <option value="INTERNE">INTERNE</option>
              <option value="CONFIDENTIEL">CONFIDENTIEL</option>
            </Select>
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Enregistrement…" : "Créer"}
            </Button>
          </div>
        </form>
      </PagePanel>
    </PageFrame>
  );
}
