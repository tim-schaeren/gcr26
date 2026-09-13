export const TRIGGER_OPTIONS = [
  { value: 'location', label: 'Location', help: 'Unlocks when the team reaches a place.' },
  { value: 'distance', label: 'Distance', help: 'Unlocks after the team has moved a set distance.' },
  { value: 'none', label: 'None', help: 'Unlocked right away.' },
];

export const TASK_OPTIONS = [
  { value: 'answer', label: 'Answer', help: 'Players type in a valid answer.' },
  { value: 'timer', label: 'Timer', help: 'Countdown, e.g. a mandatory break. Starts once unlocked.' },
  { value: 'continue', label: 'Continue', help: 'Info only — players read it and tap continue.' },
];
