import RedirectClient from "@/components/RedirectClient";
import { ADMIN_ROUTES } from "@/lib/routes";

export default function TargetsRedirect() {
  return <RedirectClient to={ADMIN_ROUTES.targets} />;
}
