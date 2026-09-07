import RedirectClient from "@/components/RedirectClient";
import { ADMIN_ROUTES } from "@/lib/routes";

export default function KeywordsRedirect() {
  return <RedirectClient to={ADMIN_ROUTES.keywords} />;
}
