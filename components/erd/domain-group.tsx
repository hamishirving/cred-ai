"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";

export interface DomainGroupData {
  label: string;
  color: string;
  bgColor: string;
}

function DomainGroupComponent({ data }: { data: DomainGroupData }) {
  return (
    <div
      className="rounded-xl border-2 border-dashed p-4 min-w-[200px] min-h-[100px]"
      style={{
        borderColor: data.color,
        backgroundColor: data.bgColor,
      }}
    >
      <div
        className="absolute -top-3 left-4 px-2 text-xs font-semibold rounded"
        style={{
          backgroundColor: data.color,
          color: "white",
        }}
      >
        {data.label}
      </div>
    </div>
  );
}

export const DomainGroup = memo(DomainGroupComponent);
