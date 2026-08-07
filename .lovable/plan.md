# Make the Dolapo Rasaq certificate genuinely verifiable

The verification machinery already exists and works — public pages at `/verify/{code}`, `/certificate/{code}` and `/report/{code}` all read the `certificates` table through `getPublicCredential`. The problem is the certificate you have as a PDF came from the **preview page**, which uses hardcoded sample data. The `certificates` table is currently empty, so any code you post will fail verification.

Fix: issue one real credential record for you, so the code on the certificate resolves to a live "Verified" page anyone can test.

## What will be done

1. **Insert a real credential row** into `certificates` for your account (`fuhad.dolapo@gmail.com`) with:
   - Recipient: Dolapo Rasaq, simulated role Project Coordinator
   - Programme: Atlas Digital Care Records Programme, project Digital Care Records Rollout
   - Score 88 / Distinction, plus the performance breakdown, competencies, strengths and development areas so `/report/{code}` is fully populated
   - Status `valid`, issued today
   - A freshly generated verification code in the live Atlas format (e.g. `ATLAS-2026-XXXXXXXXXX`) — real and unique, not the sample code printed on the preview PDF
2. **Give you the shareable links** once inserted:
   - Verification page: `https://atlassim.co/verify/{code}`
   - Certificate page (printable A4 PDF): `https://atlassim.co/certificate/{code}`
   - Performance report: `https://atlassim.co/report/{code}`
3. **Regenerate your certificate PDF from the real record** by opening `/certificate/{code}` — this version carries the working code and a QR code that scans to the verification page, so it matches what people will test. The old preview PDF (code `ATLAS-2026-A7F3K9D2M4`) should not be posted, since that code is sample data.
4. **Verify end-to-end** before handing it over: load the verification page and confirm it renders the green "Verified" state with your name, grade and score, and that an invalid code still shows the "not found" state.

## Technical notes

- Data-only change: one `INSERT` into `public.certificates` via the insert tool. No schema migration, no code changes.
- Code generation follows `generateVerificationCode` in `src/lib/certificates.server.ts`, and uniqueness is enforced by the existing unique constraint on `verification_code`.
- Public read access already exists for valid certificates, so no policy or grant changes are needed.
- Nothing about the live issuing flow (`issueCertificate` after project close-out) is touched — this only backfills your own credential.
