import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/landing/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => legalHead("Privacy Policy", "How Atlassim Technologies Ltd collects, uses and protects your personal data when you use Atlas."),
  component: () => (
    <LegalPage title="Privacy Policy" updated="26 October 2026">
      <p>This policy explains how Atlassim Technologies Ltd ("Atlas", "we") handles personal data when you use atlassim.co. We are the data controller for the information described here.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details you provide, such as your name, email address and selected role.</li>
        <li>Work you create inside the simulation, such as charters, emails, RAID entries and reports.</li>
        <li>Usage information, such as pages visited and progress through a simulation.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To provide your account and simulation, issue and verify certificates, send service emails about your account and progress, improve Atlas, and keep the service secure.</p>
      <h2>Sharing</h2>
      <p>We do not sell your data. We use trusted service providers for hosting, email delivery, AI processing and payments, who process data only on our instructions.</p>
      <h2>Your rights</h2>
      <p>Under UK data protection law you can ask to access, correct, delete or export your data, or object to its use. Contact us at <a href="mailto:hello@atlassim.co">hello@atlassim.co</a>. You can also complain to the Information Commissioner's Office (ico.org.uk).</p>
      <h2>Retention</h2>
      <p>We keep account data while your account is active and delete it on request, except where we must keep records for legal reasons.</p>
    </LegalPage>
  ),
});
