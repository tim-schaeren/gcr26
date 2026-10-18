import {
	onSnapshot,
	type DocumentData,
	type DocumentReference,
	type DocumentSnapshot,
	type Query,
	type QuerySnapshot,
} from 'firebase/firestore';

// A listener the rules refuse is dead for good. Right after joining a team,
// the rules can still see the old profile — the screen opens on the local copy
// of the write before the server has it — so team-only listeners are refused
// once and would never recover. This one tries again, backing off, until the
// server agrees or the caller stops listening.
export function listen<T = DocumentData>(
	ref: Query<T>,
	onNext: (snap: QuerySnapshot<T>) => void,
): () => void;
export function listen<T = DocumentData>(
	ref: DocumentReference<T>,
	onNext: (snap: DocumentSnapshot<T>) => void,
): () => void;
export function listen(ref: any, onNext: (snap: any) => void): () => void {
	let unsubscribe: (() => void) | null = null;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let stopped = false;
	let attempt = 0;

	const start = () => {
		unsubscribe = onSnapshot(
			ref,
			(snap: unknown) => {
				attempt = 0;
				onNext(snap);
			},
			() => {
				unsubscribe = null;
				if (stopped) return;
				timer = setTimeout(start, Math.min(30000, 1000 * 2 ** attempt++));
			},
		);
	};

	start();
	return () => {
		stopped = true;
		if (timer) clearTimeout(timer);
		unsubscribe?.();
	};
}
