import { CvDocumentCard } from "./cv-document";
import { Response } from "./elements/response";
import { EmployeeCard } from "./employee-card";

type BackendResponseProps = {
  output: { data?: unknown; error?: string };
};

// Type guards for structured responses
function hasEmployee(
  data: unknown
): data is { employee: Record<string, unknown> } {
  return (
    typeof data === "object" &&
    data !== null &&
    "employee" in data &&
    typeof (data as Record<string, unknown>).employee === "object"
  );
}

function hasCvDocument(
  data: unknown
): data is { cv_document: Record<string, unknown> } {
  return (
    typeof data === "object" &&
    data !== null &&
    "cv_document" in data &&
    typeof (data as Record<string, unknown>).cv_document === "object"
  );
}

export function BackendResponse({ output }: BackendResponseProps) {
  if (output.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
        <div className="font-medium">Error</div>
        <div className="text-sm">{output.error}</div>
      </div>
    );
  }

  if (!output.data) {
    return (
      <div className="rounded-xl border bg-muted p-4 text-muted-foreground">
        No response from backend
      </div>
    );
  }

  // If it's a string, render as markdown
  if (typeof output.data === "string") {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <Response>{output.data}</Response>
        </div>
      </div>
    );
  }

  // Check for structured employee/CV response
  const hasEmployeeData = hasEmployee(output.data);
  const hasCvData = hasCvDocument(output.data);

  if (hasEmployeeData || hasCvData) {
    return (
      <div className="space-y-4">
        {hasEmployeeData && (
          <EmployeeCard
            employee={
              (output.data as { employee: Record<string, unknown> }).employee
            }
          />
        )}
        {hasCvData && (
          <CvDocumentCard
            document={
              (output.data as { cv_document: Record<string, unknown> })
                .cv_document
            }
          />
        )}
      </div>
    );
  }

  // Fallback: render JSON data
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <pre className="overflow-auto text-sm">
        {JSON.stringify(output.data, null, 2)}
      </pre>
    </div>
  );
}


