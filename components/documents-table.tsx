import { formatDistanceToNow } from "date-fns";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { DocumentDto } from "@/lib/api/types";

interface DocumentsTableProps {
	documents: DocumentDto[];
}

export function DocumentsTable({ documents }: DocumentsTableProps) {
	if (documents.length === 0) {
		return (
			<div className="text-sm text-muted-foreground py-4">
				No documents found
			</div>
		);
	}

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Type</TableHead>
						<TableHead>Description</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Expiry</TableHead>
						<TableHead>Uploaded</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{documents.map((doc) => {
						const statusColor =
							doc.statusType === "verified"
								? "text-green-600"
								: doc.statusType === "expired"
									? "text-red-600"
									: doc.statusType === "pending"
										? "text-yellow-600"
										: "text-gray-600";

						return (
							<TableRow key={doc.id}>
								<TableCell className="font-medium">
									{doc.otherTypeName || doc.type.shortName || doc.type.name}
								</TableCell>
								<TableCell>{doc.description || "-"}</TableCell>
								<TableCell>
									<span className={`font-medium ${statusColor}`}>
										{doc.statusType}
									</span>
								</TableCell>
								<TableCell>
									{doc.activeFile?.expiry
										? new Date(doc.activeFile.expiry).toLocaleDateString()
										: "-"}
								</TableCell>
								<TableCell className="text-muted-foreground">
									{doc.activeFile?.created
										? formatDistanceToNow(new Date(doc.activeFile.created), {
												addSuffix: true,
											})
										: "-"}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
