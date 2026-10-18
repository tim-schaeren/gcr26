import LegalLayout, { H2, UL } from './LegalLayout';

export default function GuidelinesPage() {
  return (
    <LegalLayout title="Community guidelines" updated="18 October 2026">
      <p>
        Grand City Race is played among people who know each other, and it works because
        everyone keeps it friendly. These are the ground rules.
      </p>

      <H2>Be decent</H2>
      <UL>
        <li>No harassment, threats, slurs or abuse — in chat, team names, or anywhere else.</li>
        <li>No sexual content, and nothing that targets someone for who they are.</li>
        <li>Don't share other people's personal information.</li>
      </UL>

      <H2>Play fair</H2>
      <UL>
        <li>Solve quests by playing, not by digging around in the app or the database.</li>
        <li>Don't impersonate another team, player or host.</li>
        <li>Don't use the game to send anyone somewhere unsafe.</li>
      </UL>

      <H2>For hosts</H2>
      <UL>
        <li>Set quests that can be reached safely, legally and in public.</li>
        <li>Be reachable while your race is running — your players may need you.</li>
        <li>You can remove a player from your game at any time.</li>
      </UL>

      <H2>Reporting something</H2>
      <p>
        Tell the host of your game first — they can remove players and fix problems
        immediately. For anything they can't handle, or anything about a host, email{' '}
        <a className="underline" href="mailto:paddock-cliques5u@icloud.com">paddock-cliques5u@icloud.com</a>.
        We read reports and can suspend accounts.
      </p>
    </LegalLayout>
  );
}
