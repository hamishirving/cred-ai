"use client";

import {
  AwardIcon,
  BriefcaseIcon,
  FileTextIcon,
  GraduationCapIcon,
  MapPinIcon,
} from "lucide-react";

type OcrField = {
  value: string;
  fieldName?: string;
  ocrConfidence?: number;
  date?: string;
};

type CvExtraData = {
  email?: OcrField;
  awards?: OcrField[];
  gmc_number?: OcrField;
  mdu_number?: OcrField;
  phone_home?: OcrField;
  nationality?: OcrField;
  current_address?: OcrField;
  current_employer?: OcrField;
  current_position?: OcrField;
  previous_employers?: OcrField[];
  medical_school?: OcrField;
  medical_school_years?: OcrField;
};

type CvDocument = {
  document_public_id?: string;
  original_name?: string;
  extra_data?: CvExtraData;
};

type CvDocumentProps = {
  document: CvDocument;
};

function Section({
  children,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-medium text-sm">
        <Icon className="size-4 text-primary" />
        {title}
      </div>
      <div className="text-muted-foreground text-sm">{children}</div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null;
  }
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function CvDocumentCard({ document }: CvDocumentProps) {
  const data = document.extra_data;

  if (!data) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileTextIcon className="size-4" />
          <span>{document.original_name || "Document"}</span>
        </div>
        <p className="mt-2 text-muted-foreground text-sm">
          No extracted data available
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Header */}
      <div className="border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <FileTextIcon className="size-4 text-primary" />
          <span className="font-medium">
            {document.original_name || "CV Document"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-5 p-4">
        {/* Current Position */}
        {(data.current_position || data.current_employer) && (
          <Section icon={BriefcaseIcon} title="Current Position">
            {data.current_position && (
              <div className="font-medium text-foreground">
                {data.current_position.value}
              </div>
            )}
            {data.current_employer && <div>{data.current_employer.value}</div>}
          </Section>
        )}

        {/* Contact & Details */}
        {(data.current_address ||
          data.phone_home ||
          data.nationality ||
          data.gmc_number) && (
          <Section icon={MapPinIcon} title="Details">
            <div className="space-y-1">
              <DataRow label="Address" value={data.current_address?.value} />
              <DataRow label="Phone" value={data.phone_home?.value} />
              <DataRow label="Nationality" value={data.nationality?.value} />
              <DataRow label="GMC Number" value={data.gmc_number?.value} />
              <DataRow label="MDU Number" value={data.mdu_number?.value} />
            </div>
          </Section>
        )}

        {/* Education */}
        {data.medical_school && (
          <Section icon={GraduationCapIcon} title="Education">
            <div className="font-medium text-foreground">
              {data.medical_school.value}
            </div>
            {data.medical_school_years && (
              <div>{data.medical_school_years.value}</div>
            )}
          </Section>
        )}

        {/* Previous Employers */}
        {data.previous_employers && data.previous_employers.length > 0 && (
          <Section icon={BriefcaseIcon} title="Previous Employers">
            <ul className="list-inside list-disc space-y-1">
              {data.previous_employers.map((emp) => (
                <li key={emp.fieldName || emp.value}>{emp.value}</li>
              ))}
            </ul>
          </Section>
        )}

        {/* Awards */}
        {data.awards && data.awards.length > 0 && (
          <Section icon={AwardIcon} title="Awards & Achievements">
            <ul className="space-y-1.5">
              {data.awards.map((award) => (
                <li
                  className="flex items-start gap-2"
                  key={award.fieldName || award.value}
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>
                    {award.value}
                    {award.date && (
                      <span className="ml-2 text-muted-foreground text-xs">
                        ({new Date(award.date).getFullYear()})
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}

