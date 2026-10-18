// TEMPORARY — built for the race of 24 October 2026 and meant to be removed
// afterwards. Everything belonging to it is marked "Avatar (temporary)".
//
// Each team has a picture that evolves as it plays: hosts set a picture per
// team per quest in games/{id}/avatars/{teamId}, as { [questId]: url }.

export type AvatarPictures = Record<string, string>;

// The picture for where a team is now. A quest without its own picture shows
// the latest earlier one, so hosts only set pictures where the avatar changes.
// A finished team keeps its last picture.
export function avatarPictureFor(
  pictures: AvatarPictures | null | undefined,
  questOrder: string[],
  currentQuestId: string | null | undefined,
  finished: boolean,
): string | null {
  if (!pictures || !questOrder.length) return null;
  let index = finished
    ? questOrder.length - 1
    : questOrder.indexOf(currentQuestId ?? questOrder[0]);
  if (index < 0) index = 0;
  for (let i = index; i >= 0; i--) {
    const url = pictures[questOrder[i]]?.trim();
    if (url) return url;
  }
  return null;
}
