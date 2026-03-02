"use client";

import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ExecutionContent } from "@/components/agents/execution-content";

interface ExecutionModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	agentId: string;
	executionId: string;
	agentName: string;
}

export function ExecutionModal({
	open,
	onOpenChange,
	agentId,
	executionId,
	agentName,
}: ExecutionModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col p-0 gap-0 [&>button:last-child]:hidden">
				<VisuallyHidden>
					<DialogTitle>{agentName} Execution</DialogTitle>
				</VisuallyHidden>
				<ExecutionContent
					agentId={agentId}
					executionId={executionId}
					agentName={agentName}
					hideRerun
					onClose={() => onOpenChange(false)}
				/>
			</DialogContent>
		</Dialog>
	);
}
