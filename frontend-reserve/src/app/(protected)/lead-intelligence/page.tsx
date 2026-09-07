import RedirectClient from "@/components/RedirectClient";
import { ADMIN_ROUTES } from "@/lib/routes";

export default function LeadIntelligenceRedirect() {
  return <RedirectClient to={ADMIN_ROUTES.leadIntelligence} />;
}
