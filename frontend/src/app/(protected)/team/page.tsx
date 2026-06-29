import RedirectClient from "@/components/RedirectClient";
import { ADMIN_ROUTES } from "@/lib/routes";

export default function TeamRedirect() {
  return <RedirectClient to={ADMIN_ROUTES.team} />;
}
