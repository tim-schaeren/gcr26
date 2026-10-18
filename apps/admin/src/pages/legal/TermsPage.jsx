import LegalLayout, { H2, UL } from './LegalLayout';

// Draft — have it reviewed before relying on it.
export default function TermsPage() {
  return (
    <LegalLayout title="Terms of use" updated="18 October 2026">
      <p>
        By using Grand City Race you agree to these terms. If you host a game, they apply
        to you twice over: as a player and as a host.
      </p>

      <H2>Play safely</H2>
      <p>
        This game sends you walking around a real city. You are responsible for your own
        safety and for the people with you.
      </p>
      <UL>
        <li>Obey traffic laws and pay attention to the road, not to your phone.</li>
        <li>Do not trespass, climb, or enter anywhere you are not allowed to be.</li>
        <li>Respect other people, private property and local rules.</li>
        <li>Stop playing if conditions become unsafe.</li>
      </UL>
      <p>
        No quest, hint or countdown is ever a reason to take a risk. Hosts are responsible
        for setting quests that can be completed safely and legally.
      </p>

      <H2>Your account</H2>
      <UL>
        <li>You need to be at least 13 years old to have an account.</li>
        <li>Keep your password to yourself; what happens under your account is your responsibility.</li>
        <li>Use a name your fellow players would be comfortable seeing.</li>
      </UL>

      <H2>Hosting a game</H2>
      <p>
        Hosts decide the quests, the teams and the rules of their own race, and can see
        their players' locations while the game runs. If you host, you are responsible for
        what you ask your players to do and for handling their information decently.
      </p>

      <H2>What we provide</H2>
      <p>
        The service is provided as it is, without guarantees. It depends on GPS, mobile
        networks and third-party services, none of which we control, and any of which can
        fail in the middle of your race. We may change or discontinue features.
      </p>

      <H2>Ending it</H2>
      <p>
        You can delete your account in the app at any time. We may suspend accounts that
        break these terms or the community guidelines.
      </p>

      <H2>Contact</H2>
      <p>
        <a className="underline" href="mailto:paddock-cliques5u@icloud.com">paddock-cliques5u@icloud.com</a>
      </p>
    </LegalLayout>
  );
}
