"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";
import { getEntityMeta } from "./erd-metadata";
import { erdConfig, type DomainKey } from "./erd-config";

interface EntityTooltipProps {
  tableName: string;
  domain: DomainKey;
  children: React.ReactNode;
}

export function EntityTooltip({
  tableName,
  domain,
  children,
}: EntityTooltipProps) {
  const meta = getEntityMeta(tableName);
  const domainConfig = erdConfig.domains[domain];

  if (!meta) {
    return <>{children}</>;
  }

  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="right"
            sideOffset={10}
            className="w-72 p-0 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
          >
            <div
              className="px-3 py-2 text-white text-sm font-semibold"
              style={{ backgroundColor: domainConfig?.color || "#6b7280" }}
            >
              {meta.displayName}
            </div>
            <div className="p-3 space-y-2">
              <p className="text-sm">{meta.description}</p>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Purpose:</span> {meta.purpose}
              </div>
              {meta.enables.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium text-muted-foreground">
                    Enables:
                  </span>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    {meta.enables.map((item, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-green-500">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
