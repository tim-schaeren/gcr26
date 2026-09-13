import type { ContentBlock, Quest, QuestTask, QuestTrigger } from './types';

const TRIGGERS: QuestTrigger[] = ['location', 'distance', 'none'];
const TASKS: QuestTask[] = ['answer', 'timer', 'continue'];

// Accepts legacy plain-string content as well as block arrays
export function toBlocks(value: unknown): ContentBlock[] {
  if (Array.isArray(value)) return value as ContentBlock[];
  if (typeof value === 'string' && value.trim()) return [{ type: 'text', text: value }];
  return [];
}

// Fills in defaults for quests created before trigger/task existed
export function normalizeQuest(id: string, data: Record<string, any>): Quest {
  return {
    ...data,
    id,
    title: data.title ?? '',
    trigger: TRIGGERS.includes(data.trigger) ? data.trigger : 'location',
    task: TASKS.includes(data.task) ? data.task : 'answer',
    description: toBlocks(data.description),
    navigationHint: toBlocks(data.navigationHint),
    isActive: data.isActive ?? true,
  };
}

export function hasContent(blocks: ContentBlock[]): boolean {
  return blocks.some(b =>
    (b.type === 'text' && b.text.trim()) ||
    (b.type === 'image' && b.url.trim()) ||
    (b.type === 'youtube' && b.videoId),
  );
}

// Handles youtu.be, watch?v=, shorts/, embed/, live/ links and bare 11-char IDs
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const match = s.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/,
  );
  return match ? match[1] : null;
}
