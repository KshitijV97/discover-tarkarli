"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { FormValues, SettingsGroupDef } from "@/lib/admin/settings-form";
import { saveSettingsGroupAction } from "./actions";

const selectClass = "block h-12 w-full rounded-md border border-border bg-surface px-3.5 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function SettingsGroupForm({ group, initial }: { group: SettingsGroupDef; initial: FormValues }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveSettingsGroupAction(group.key, formData);
      if (res.ok) {
        setErrors({});
        setStatus({ ok: true, text: "Saved. Changes apply to new bookings and pages right away." });
      } else {
        setErrors(res.errors);
        setStatus({ ok: false, text: res.message });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {group.fields.map((field) => {
        const error = errors[field.name];
        const defaultValue = initial[field.name] ?? "";
        switch (field.kind) {
          case "boolean":
            return (
              <div key={field.name}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input type="checkbox" name={field.name} defaultChecked={defaultValue === "on"} className="h-5 w-5 accent-primary" />
                  <span className="text-sm font-medium text-foreground">{field.label}</span>
                </label>
                {field.hint && <span className="ml-8 block text-xs text-muted">{field.hint}</span>}
                {error && <span className="ml-8 block text-sm text-danger">{error}</span>}
              </div>
            );
          case "select":
            return (
              <label key={field.name} className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">{field.label}</span>
                <select name={field.name} defaultValue={defaultValue} className={selectClass}>
                  {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
              </label>
            );
          case "number":
            return (
              <Field key={field.name} name={field.name} label={field.label} type="number" inputMode="decimal" step={field.step ?? "any"} defaultValue={defaultValue} error={error} hint={field.hint} />
            );
          case "time":
            return <Field key={field.name} name={field.name} label={field.label} type="time" defaultValue={defaultValue} error={error} hint={field.hint} />;
          default:
            return <Field key={field.name} name={field.name} label={field.label} type="text" defaultValue={defaultValue} error={error} hint={field.hint} />;
        }
      })}

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : `Save ${group.title.toLowerCase()}`}</Button>
        {status && (
          <p role="status" className={`text-sm ${status.ok ? "text-success" : "text-danger"}`}>{status.text}</p>
        )}
      </div>
    </form>
  );
}
