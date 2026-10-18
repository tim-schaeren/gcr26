import { auth } from '../firebase';
import { WEB_URL } from '../config';

// The server functions live on the website. Against the local emulators they
// run on this computer instead: set EXPO_PUBLIC_API_URL to that address.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? WEB_URL;

// Calls a server function as the signed-in player. Errors carry the server's
// own sentence ("Not enough coins"), ready to show.
export async function callApi<T>(path: string, body: unknown): Promise<T> {
	const user = auth.currentUser;
	if (!user) throw new Error('Sign in first');
	const token = await user.getIdToken();
	let res: Response;
	try {
		res = await fetch(`${API_URL}${path}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify(body),
		});
	} catch {
		throw new Error('No connection. Try again.');
	}
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Try again.');
	return data as T;
}
