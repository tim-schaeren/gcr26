import { Linking } from 'react-native';
import { CONTACT_EMAIL, LEGAL } from '../config';

// Opens a pre-filled email to us about the game the player is in, so a
// report arrives with what we need to find it. Without a mail app, the
// support page shows the address instead.
export async function reportProblem(context: {
	gameId?: string | null;
	gameName?: string | null;
	teamName?: string | null;
}) {
	const lines = [
		'What happened?',
		'',
		'',
		'',
		'— Please keep the lines below, they help us find the game —',
		`Game: ${context.gameName ?? 'unknown'} (${context.gameId ?? 'no id'})`,
		...(context.teamName ? [`Team: ${context.teamName}`] : []),
	];
	const subject = `Report: ${context.gameName ?? 'Grand City Race'}`;
	const url = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
	try {
		await Linking.openURL(url);
	} catch {
		Linking.openURL(LEGAL.support).catch(() => {});
	}
}
