"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import type { CatalogField, FormValues } from "@/lib/admin/catalog-forms";

export type SaveResult = { ok: true; id: string } | { ok: false; message: string; errors: Record<string, string> };

const areaClass = "block w-full rounded-md border bg-surface p-3.5 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

/** Generic editor used by the rooms and menu pages. Field definitions live in lib/admin/catalog-forms.ts. */
export function CatalogForm({ fields, initial, save, backHref, submitLabel }: {
  fields: CatalogField[]; initial: FormValues; save: (data: FormData) => Promise<SaveResult>; backHref: string; submitLabel: string;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    start(async () => {
      const res = await save(data);
      if (res.ok) {
        setErrors({});
        setStatus({ ok: true, text: "Saved. The site shows the change now." });
        router.push(backHref);
        router.refresh();
      } else {
        setErrors(res.errors);
        setStatus({ ok: false, text: res.message });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {fields.map((f) => {
        const error = errors[f.name];
        const value = initial[f.name] ?? "";
        if (f.kind === "boolean") {
          return (
            <div key={f.name}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input type="checkbox" name={f.name} defaultChecked={value === "on"} className="h-5 w-5 accent-primary" />
                <span className="text-sm font-medium">{f.label}</span>
              </label>
              {f.hint && <span className="ml-8 block text-xs text-muted">{f.hint}</span>}
              {error && <span className="ml-8 block text-sm text-danger">{error}</span>}
            </div>
          );
        }
        if (f.kind === "textarea" || f.kind === "lines") {
          return (
            <label key={f.name} className="block">
              <span className="mb-1.5 block text-sm font-medium">{f.label}</span>
              <textarea name={f.name} defaultValue={value} rows={f.kind === "lines" ? 4 : 3} placeholder={f.placeholder}
                aria-invalid={!!error} className={`${areaClass} ${error ? "border-danger" : "border-border"}`} />
              {error ? <span className="mt-1 block text-sm text-danger">{error}</span> : f.hint ? <span className="mt-1 block text-xs text-muted">{f.hint}</span> : null}
            </label>
          );
        }
        return (
          <Field key={f.name} name={f.name} label={f.label} defaultValue={value} error={error} hint={f.hint}
            {...(f.kind === "number" ? { type: "number", inputMode: "decimal" as const, step: f.step ?? "any" } : { type: "text" })} />
        );
      })}
      <div className="flex flex-wrap items-center gap-4 pt-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : submitLabel}</Button>
        <a href={backHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">Back</a>
        {status && <p role="status" className={`text-sm ${status.ok ? "text-success" : "text-danger"}`}>{status.text}</p>}
      </div>
    </form>
  );
}
