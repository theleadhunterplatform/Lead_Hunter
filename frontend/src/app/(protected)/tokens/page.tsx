import RedirectClient from "@/components/RedirectClient";
import { ADMIN_ROUTES } from "@/lib/routes";

export default function TokensRedirect() {
  return <RedirectClient to={ADMIN_ROUTES.tokens} />;
}
