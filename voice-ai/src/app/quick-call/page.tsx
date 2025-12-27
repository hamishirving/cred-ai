import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CallForm } from "@/components/call-form";

export default function QuickCallPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Link href="/">
          <Button variant="outline" className="mb-4">
            ← Back to Home
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Quick Reference Call</h1>
        <p className="text-muted-foreground">
          Manually enter details to initiate a reference check call
        </p>
      </div>

      <CallForm />
    </div>
  );
}
