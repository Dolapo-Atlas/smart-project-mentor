import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/landing/legal-page";

export const Route = createFileRoute("/terms")({
  head: () => legalHead("Terms of Use", "The terms that apply when you use the Atlas workplace simulation platform."),
  component: () => (
    <LegalPage title="Terms of Use" updated="26 October 2026">
      <p>These terms apply to your use of Atlas, operated by Atlassim Technologies Ltd. By creating an account you agree to them.</p>
      <h2>The service</h2>
      <p>Atlas provides simulated workplace experience. The companies, projects and people in the simulation are fictional. Atlas is not employment, is not an accredited qualification, and is not affiliated with any organisation depicted.</p>
      <h2>Your account</h2>
      <p>Keep your login details secure and provide accurate information. You are responsible for activity on your account.</p>
      <h2>Your work</h2>
      <p>You own the content you write inside Atlas. You allow us to store and process it to run the simulation, provide feedback and issue certificates.</p>
      <h2>Acceptable use</h2>
      <p>Do not misuse the service, attempt to access other learners' data, or misrepresent certificates you have not earned.</p>
      <h2>Liability</h2>
      <p>Atlas is provided as is. Nothing in these terms limits liability that cannot be limited under the law of England and Wales.</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the law of England and Wales.</p>
    </LegalPage>
  ),
});
