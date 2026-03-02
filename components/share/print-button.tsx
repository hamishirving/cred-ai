"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
	const searchParams = useSearchParams();
	const autoPrint = searchParams.get("print") === "true";

	useEffect(() => {
		if (autoPrint) {
			const timer = setTimeout(() => window.print(), 600);
			return () => clearTimeout(timer);
		}
	}, [autoPrint]);

	return (
		<Button
			variant="outline"
			size="sm"
			className="print:hidden gap-1.5"
			onClick={() => window.print()}
		>
			<Printer className="h-3.5 w-3.5" />
			Print
		</Button>
	);
}
