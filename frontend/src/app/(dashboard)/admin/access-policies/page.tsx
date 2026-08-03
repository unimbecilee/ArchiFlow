import { redirect } from "next/navigation";

export default function AdminAccessPoliciesRedirectPage() {
  redirect("/parametres/politiques-abac");
}
