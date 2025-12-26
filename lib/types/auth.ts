export interface User {
	id: string;
	email: string;
	type: "regular";
}

export interface Session {
	user: User;
}
