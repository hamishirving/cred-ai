export interface User {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	type: "regular";
	roleName: string | null;
	roleSlug: string | null;
}

export interface Session {
	user: User;
}
