import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/landing/legal-page";

export const Route = createFileRoute("/cookies")({
  head: () => legalHead("Cookie Policy", "How Atlas uses cookies and browser storage to keep you signed in and save your progress."),
  component: () => (
    <LegalPage title="Cookie Policy" updated="26 October 2026">
      <p>Atlas uses a small amount of cookies and browser storage to make the service work.</p>
      <h2>Essential storage</h2>
      <ul>
        <li>Keeping you signed in to your account.</li>
        <li>Saving draft work locally so you do not lose changes.</li>
        <li>Remembering where you came from when you sign up.</li>
      </ul>
      <h2>Analytics</h2>
      <p>We measure how the site and simulation are used so we can improve them.</p>
      <h2>Managing cookies</h2>
      <p>You can clear or block cookies in your browser settings. Blocking essential storage will stop sign-in from working.</p>
      <p>Questions: <a href="mailto:hello@atlassim.co">hello@atlassim.co</a>.</p>
    </LegalPage>
  ),
});
