import { motion } from "framer-motion";
import { User, FileText, ClipboardCheck, FileEdit, Mail, Search, ListTodo } from "lucide-react";

const capabilities = [
	{ icon: User, text: "Look up employee profiles" },
	{ icon: FileText, text: "View compliance documents" },
	{ icon: ClipboardCheck, text: "Check compliance package status" },
	{ icon: FileEdit, text: "Create forms and surveys" },
	{ icon: Mail, text: "Draft emails" },
	{ icon: Search, text: "Search compliance knowledge base" },
	{ icon: ListTodo, text: "Create tasks for team members" },
];

export const Greeting = () => {
	return (
		<div
			className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
			key="overview"
		>
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="font-semibold text-xl md:text-2xl"
				exit={{ opacity: 0, y: 10 }}
				initial={{ opacity: 0, y: 10 }}
				transition={{ delay: 0.5 }}
			>
				Hello there!
			</motion.div>
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="text-xl text-zinc-500 md:text-2xl"
				exit={{ opacity: 0, y: 10 }}
				initial={{ opacity: 0, y: 10 }}
				transition={{ delay: 0.6 }}
			>
				How can I help you today?
			</motion.div>

			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2"
				exit={{ opacity: 0, y: 10 }}
				initial={{ opacity: 0, y: 10 }}
				transition={{ delay: 0.7 }}
			>
				{capabilities.map(({ icon: Icon, text }) => (
					<div
						key={text}
						className="flex items-center gap-2 text-sm text-muted-foreground"
					>
						<Icon className="size-4 shrink-0" />
						<span>{text}</span>
					</div>
				))}
			</motion.div>
		</div>
	);
};
