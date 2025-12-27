import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            AI Employment Verification
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Streamline your hiring process with AI-powered voice calls to verify
            candidate work history with previous employers
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Manage Candidates</CardTitle>
              <CardDescription>
                View and manage reference checks for all candidates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/candidates">
                <Button className="w-full">View Candidates</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Quick Reference Call</CardTitle>
              <CardDescription>
                Initiate a reference check call manually
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/quick-call">
                <Button variant="outline" className="w-full">
                  Start Manual Call
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-zinc-500 dark:text-zinc-500">
          <p>
            Powered by{" "}
            <a
              href="https://vapi.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              VAPI
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
