import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalHead, COMPANY_LINE } from "@/components/landing/legal-page";

export const Route = createFileRoute("/contact")({
  head: () => legalHead("Contact", "Get in touch with the Atlas team at Atlassim Technologies Ltd."),
  component: () => (
    <LegalPage title="Contact">
      <p>We'd love to hear from you — questions, feedback, partnerships or support.</p>
      <h2>Email</h2>
      <p><a href="mailto:hello@atlassim.co">hello@atlassim.co</a></p>
      <h2>LinkedIn</h2>
      <p><a href="https://www.linkedin.com/company/atlas-sim" target="_blank" rel="noopener noreferrer">linkedin.com/company/atlas-sim</a></p>
      <h2>Company details</h2>
      <p>{COMPANY_LINE}</p>
    </LegalPage>
  ),
});
