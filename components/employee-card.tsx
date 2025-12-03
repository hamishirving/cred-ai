"use client";

import {
  BriefcaseIcon,
  BuildingIcon,
  CalendarIcon,
  MailIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserIcon,
} from "lucide-react";

type Employee = {
  email?: string;
  first_name?: string;
  last_name?: string;
  public_id?: string;
  organisation?: string;
  title_key?: string;
  phone?: string;
  birth_date?: string;
  registration_number?: string;
  registration_number_type?: string;
  status?: string;
  compliance_status?: string;
  personnel_name?: string;
  staff_type?: string;
  start_date?: string;
};

type EmployeeCardProps = {
  employee: Employee;
};

function StatusBadge({ status }: { status: string }) {
  const isPositive =
    status === "ACTIVE" || status === "COMPLIANT" || status === "APPROVED";
  const isWarning = status === "PENDING" || status === "REVIEW";

  const styles = isPositive
    ? { backgroundColor: "var(--positive-bg)", color: "var(--positive-dark)" }
    : isWarning
      ? { backgroundColor: "var(--warning-bg)", color: "var(--warning-dark)" }
      : { backgroundColor: "var(--muted)", color: "var(--muted-foreground)" };

  return (
    <span
      className="rounded-full px-2 py-0.5 font-medium text-xs capitalize"
      style={styles}
    >
      {status.toLowerCase().replace("_", " ")}
    </span>
  );
}

function InfoRow({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm">
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  );
}

export function EmployeeCard({ employee }: EmployeeCardProps) {
  const title = employee.title_key ? `${employee.title_key}. ` : "";
  const fullName = [employee.first_name, employee.last_name]
    .filter(Boolean)
    .join(" ");

  const displayName = `${title}${fullName}` || "Unknown";

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserIcon className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          {/* Name and badges */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-lg">{displayName}</h3>
            {employee.status && <StatusBadge status={employee.status} />}
            {employee.compliance_status && (
              <StatusBadge status={employee.compliance_status} />
            )}
          </div>

          {/* Role */}
          {employee.personnel_name && (
            <div className="mt-1 font-medium text-primary text-sm">
              {employee.personnel_name}
              {employee.staff_type && (
                <span className="ml-1 text-muted-foreground">
                  ({employee.staff_type.toLowerCase()})
                </span>
              )}
            </div>
          )}

          {/* Contact & details grid */}
          <div className="mt-3 grid gap-1.5">
            {employee.email && (
              <InfoRow icon={MailIcon}>{employee.email}</InfoRow>
            )}
            {employee.phone && (
              <InfoRow icon={PhoneIcon}>{employee.phone}</InfoRow>
            )}
            {employee.organisation && (
              <InfoRow icon={BuildingIcon}>{employee.organisation}</InfoRow>
            )}
            {employee.registration_number && (
              <InfoRow icon={ShieldCheckIcon}>
                {employee.registration_number_type || "Reg"}:{" "}
                {employee.registration_number}
              </InfoRow>
            )}
            {employee.birth_date && (
              <InfoRow icon={CalendarIcon}>
                DOB: {formatDate(employee.birth_date)}
              </InfoRow>
            )}
            {employee.start_date && (
              <InfoRow icon={BriefcaseIcon}>
                Started: {formatDate(employee.start_date)}
              </InfoRow>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

