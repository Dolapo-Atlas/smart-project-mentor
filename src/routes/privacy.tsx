import { createFileRoute, Link } from "@tanstack/react-router";
import { COMPANY_LINE, LegalPage, legalHead } from "@/components/landing/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => legalHead("Privacy Policy", "How Atlassim Technologies Ltd collects, uses and protects your personal data when you use Atlas."),
  component: () => (
    <LegalPage title="Privacy Policy" updated="27 October 2026">
      <h2>1. Who we are</h2>
      <p>Atlas is operated by Atlassim Technologies Ltd ("Atlas", "we"). We are the data controller for the personal information described in this policy.</p>
      <p>{COMPANY_LINE}</p>
      <p>For privacy enquiries, write to our registered office or use our <Link to="/contact">contact page</Link>.</p>
      <h2>2. What we collect</h2>
      <ul>
        <li>Account and profile information, such as your name, email address, selected role and information you choose to provide about your background or goals. Password authentication is handled by our authentication service.</li>
        <li>Simulation information, including your decisions, written responses, documents, messages, progress, scores and credentials.</li>
        <li>Usage and technical information, including pages and features used, engagement events, browser and device information, network information and campaign attribution where available.</li>
        <li>Support information you provide when contacting us.</li>
        <li>If you use a payment feature, payment and purchase records supplied by our payment provider. Card details are handled by the payment provider rather than entered into Atlas simulation documents.</li>
      </ul>
      <h2>3. Purposes and legal bases</h2>
      <ul>
        <li>To create and run your account, deliver simulations, process your work, provide feedback and issue credentials: performance of our contract with you.</li>
        <li>To secure the service, prevent abuse, investigate errors and improve Atlas: our legitimate interests, subject to your rights.</li>
        <li>To send account and service messages: performance of our contract or our legitimate interests, depending on the message.</li>
        <li>To meet applicable legal obligations: legal obligation.</li>
        <li>Where consent is required for non-essential tracking or marketing: consent. Creating an account is not, by itself, consent to marketing.</li>
      </ul>
      <h2>4. AI processing</h2>
      <p>Atlas uses AI services, including Google Gemini accessed directly or through Lovable's AI services, to generate simulated stakeholder responses and feedback. Depending on the feature, your submitted text, recent conversation and relevant simulation context are sent to these services to generate a response.</p>
      <p>AI responses may be inaccurate or incomplete. They support learning and should not be relied on as professional, legal or financial advice. Do not enter sensitive personal information, other people's personal data or confidential information belonging to your employer. Provider processing is subject to the applicable service terms and privacy commitments.</p>
      <h2>5. Service providers and disclosure</h2>
      <p>We do not sell your personal data. We use Lovable Cloud for hosting, database and authentication services, Lovable's managed email service for account and service emails, and Lovable and Google for the AI processing described above. Stripe handles payment features where used.</p>
      <p>We measure website visits and learner engagement using platform analytics and Atlas's progress tracking. Atlas also has optional Google Analytics and Meta tracking integrations; these are separate from essential account storage. See our <Link to="/cookies">Cookie Policy</Link> for cookies, browser storage and tracking information.</p>
      <p>We may disclose information where required by law or necessary to protect the service and our rights. If you use public credential verification or authorised agent integrations, the relevant credential information or account data is made available through that feature within its access permissions.</p>
      <h2>6. International processing</h2>
      <p>Our service providers may process information outside the UK. Applicable UK data protection requirements govern international transfers. You can contact us to request information about the safeguards applicable to your data.</p>
      <h2>7. Retention and account closure</h2>
      <p>We retain account and simulation information while needed to provide the service. You can request deletion or close your account through account settings. Some records may need to be retained for security, legal obligations or disputes; backup copies and provider records may follow separate retention processes. Contact us for information about a particular record or deletion request.</p>
      <h2>8. Your rights</h2>
      <p>Under UK data protection law, subject to applicable conditions, you can request access, correction, deletion, restriction or portability of your data, object to processing, and withdraw consent where processing relies on it. Use our <Link to="/contact">contact page</Link> or write to our registered office. Requests will be handled within the time limits required by law, normally one month.</p>
      <p>You can complain to the Information Commissioner's Office at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.</p>
      <h2>9. Security</h2>
      <p>We use access controls and encrypted connections to protect personal information. No service is completely secure. Where a personal data breach requires notification, we will follow the applicable legal requirements.</p>
      <h2>10. Changes</h2>
      <p>We update this page when our practices change and show the latest revision date above. Where notification is required by law, we will provide it.</p>
    </LegalPage>
  ),
});
