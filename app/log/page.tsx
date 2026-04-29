import { Header } from "@/components/header";
import { LogForm } from "./log-form";

export default function LogPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">New impact log</h1>
          <p className="text-sm text-zinc-500">
            Tap to fill in. Big buttons by design — works after a hard session.
          </p>
        </div>
        <LogForm />
      </main>
    </>
  );
}
