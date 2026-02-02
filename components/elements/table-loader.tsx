import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

const WIDTHS = ["w-[60%]", "w-[40%]", "w-[50%]", "w-[30%]", "w-[45%]"];

export function TableLoader({ cols, rows }: { cols: number; rows: number }) {
	return (
		<Table>
			<TableHeader>
				<TableRow className="bg-[#faf9f7] hover:bg-[#faf9f7]">
					{Array.from({ length: cols }).map((_, i) => (
						<TableHead key={i}>
							<Skeleton className="h-3 w-16" />
						</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				{Array.from({ length: rows }).map((_, rowIdx) => (
					<TableRow key={rowIdx} className="bg-white">
						{Array.from({ length: cols }).map((_, colIdx) => (
							<TableCell key={colIdx}>
								<Skeleton
									className={`h-3.5 ${WIDTHS[(rowIdx + colIdx) % WIDTHS.length]}`}
								/>
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
