export interface User {
	id: string;
	email: string;
	type: "guest" | "regular";
}

export interface Session {
	user: User;
}
