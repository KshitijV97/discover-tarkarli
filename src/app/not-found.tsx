import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-20 text-center">
      <h1 className="text-3xl font-semibold">Not found</h1>
      <p className="mt-2 text-muted">This page or booking link doesn&apos;t exist.</p>
      <Link href="/" className="mt-6 inline-block text-primary underline">Back to home</Link>
    </div>
  );
}
