"use client";

import { useMemo, useState, useTransition, type CSSProperties, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { COLOR_GROUPS, RADIUS_PRESETS, checkContrast, isHex, type FormValues } from "@/lib/admin/theme-form";
import { hexToChannels } from "@/lib/theme";
import { saveThemeAction } from "./actions";

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

/** Colour pickers with a live preview. The preview sets the same CSS variables the site uses, on a box only. */
export function ThemeEditor({ initial, defaults }: { initial: FormValues; defaults: FormValues }) {
  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pending, start] = useTransition();

  const colors = useMemo(() => Object.fromEntries(Object.entries(values).filter(([k]) => k.startsWith("color:")).map(([k, v]) => [k.slice(6), v])), [values]);
  const allValid = Object.values(colors).every(isHex);
  const checks = allValid ? checkContrast(colors as never) : [];
  const previewStyle = useMemo(() => {
    const s: Record<string, string> = {};
    for (const [k, v] of Object.entries(colors)) if (isHex(v)) s[`--color-${kebab(k)}`] = hexToChannels(v);
    s["--radius-card"] = values["radius:card"];
    return s as CSSProperties;
  }, [colors, values]);

  function submit(data: FormData) {
    start(async () => {
      const res = await saveThemeAction(data);
      setStatus({ ok: res.ok, text: res.message });
      setErrors(res.ok ? {} : res.errors);
      setConfirmReset(false);
      if (res.ok && data.get("reset") === "1") setValues(defaults);
    });
  }
  function onSubmit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); submit(new FormData(e.currentTarget)); }
  const set = (k: string, v: string) => { setValues((x) => ({ ...x, [k]: v })); setStatus(null); };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <form onSubmit={onSubmit} className="min-w-0 space-y-6" noValidate>
        {COLOR_GROUPS.map((g) => (
          <Card key={g.title} className="p-6">
            <h2 className="text-lg font-semibold">{g.title}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {g.fields.map((f) => {
                const name = `color:${f.key}`;
                const v = values[name] ?? "";
                return (
                  <div key={name}>
                    <span className="mb-1.5 block text-sm font-medium" id={`${name}-label`}>{f.label}</span>
                    <div className="flex items-center gap-2">
                      <input type="color" aria-labelledby={`${name}-label`} value={isHex(v) ? v : "#000000"} onChange={(e) => set(name, e.target.value.toUpperCase())}
                        className="h-11 w-14 cursor-pointer rounded-md border border-border bg-surface p-1" />
                      <input name={name} value={v} onChange={(e) => set(name, e.target.value.trim())} aria-labelledby={`${name}-label`} spellCheck={false}
                        className={`h-11 w-32 rounded-md border bg-surface px-3 font-mono text-sm uppercase ${errors[name] || !isHex(v) ? "border-danger" : "border-border"}`} />
                      {v.toUpperCase() !== defaults[name] && (
                        <button type="button" className="min-h-11 px-2 text-xs font-semibold text-primary" onClick={() => set(name, defaults[name])}>Default</button>
                      )}
                    </div>
                    {errors[name] && <span className="mt-1 block text-sm text-danger">{errors[name]}</span>}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
        <Card className="p-6">
          <label className="block max-w-xs">
            <span className="mb-1.5 block text-lg font-semibold">Card corners</span>
            <select name="radius:card" value={values["radius:card"]} onChange={(e) => set("radius:card", e.target.value)}
              className="block h-12 w-full rounded-md border border-border bg-surface px-3.5 text-base">
              {RADIUS_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
        </Card>
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-raised">
          <Button type="submit" disabled={pending || !allValid}>{pending ? "Saving…" : "Save theme"}</Button>
          {!confirmReset
            ? <Button type="button" variant="ghost" onClick={() => setConfirmReset(true)} disabled={pending}>Reset to default…</Button>
            : <Button type="button" variant="outline" disabled={pending} onClick={() => { const d = new FormData(); d.set("reset", "1"); submit(d); }}>Yes, reset the whole site</Button>}
          {status && <p role="status" className={`text-sm ${status.ok ? "text-success" : "text-danger"}`}>{status.text}</p>}
        </div>
      </form>

      <div className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div style={previewStyle} className="overflow-hidden rounded-card border border-border">
          <div className="bg-ink p-5 text-ink-foreground">
            <p className="font-heading text-xl font-semibold">Preview</p>
            <p className="text-sm opacity-80">Dark sections like the hero and footer</p>
          </div>
          <div className="space-y-4 bg-background p-5 text-foreground">
            <p className="font-heading text-2xl font-semibold">Sea Breeze Suite</p>
            <p className="text-muted">Secondary text, like room details and hints.</p>
            <div className="rounded-card border border-border bg-surface p-4 shadow-card">
              <p className="font-semibold">A card</p>
              <p className="text-sm text-muted">₹6,500 / night · sleeps 4</p>
              <a className="mt-2 inline-block text-sm font-semibold text-primary">A link</a>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex min-h-11 items-center rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground">Main button</span>
              <span className="inline-flex min-h-11 items-center rounded-pill bg-accent px-5 text-sm font-semibold text-accent-foreground">Book a stay</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-pill bg-success/15 px-2.5 py-1 text-success">confirmed</span>
              <span className="rounded-pill bg-warning/15 px-2.5 py-1 text-warning">pending</span>
              <span className="rounded-pill bg-danger/10 px-2.5 py-1 text-danger">cancelled</span>
              <span className="rounded-pill bg-primary-soft px-2.5 py-1 text-primary">highlight</span>
            </div>
          </div>
        </div>
        <Card className="p-5">
          <h2 className="font-semibold">Readability</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-3">
                <span>{c.label}</span>
                <span className={`whitespace-nowrap font-semibold ${c.level === "ok" ? "text-success" : c.level === "warn" ? "text-warning" : "text-danger"}`}>
                  {c.ratio}:1 {c.level === "ok" ? "good" : c.level === "warn" ? "low" : "too low"}
                </span>
              </li>
            ))}
            {!allValid && <li className="text-danger">Fix the colour codes to see readability.</li>}
          </ul>
          <p className="mt-3 text-xs text-muted">4.5:1 or more is comfortable to read. &ldquo;Too low&rdquo; can&apos;t be saved.</p>
        </Card>
      </div>
    </div>
  );
}
