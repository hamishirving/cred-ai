import type { Customer } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";

function StatusBadge({ status }: { status?: Customer["status"] }) {
	if (!status) return null;

	const variantByStatus = {
		active: "success",
		inactive: "neutral",
		pending: "warning",
	} as const;

	const variant = variantByStatus[status] ?? "neutral";

	return (
		<Badge variant={variant} className="px-2 py-0.5 text-xs font-medium capitalize">
			{status}
		</Badge>
	);
}

export function CustomerCard({ customer }: { customer: Customer }) {
	return (
		<div className="rounded-xl border bg-card p-4 shadow-sm">
			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<h3 className="truncate font-semibold text-lg">{customer.name}</h3>
						<StatusBadge status={customer.status} />
					</div>
					<p className="text-muted-foreground text-sm">{customer.email}</p>
					{customer.phone && (
						<p className="text-muted-foreground text-sm">{customer.phone}</p>
					)}
				</div>
				<span className="shrink-0 font-mono text-muted-foreground text-xs">
					#{customer.id}
				</span>
			</div>
		</div>
	);
}

export function CustomerList({ customers }: { customers: Customer[] }) {
	if (customers.length === 0) {
		return (
			<div className="rounded-xl border bg-muted/50 p-4 text-center text-muted-foreground">
				No customers found
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{customers.map((customer) => (
				<CustomerCard key={customer.id} customer={customer} />
			))}
		</div>
	);
}
