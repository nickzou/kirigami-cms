import { Link } from "react-router";
import { Logo } from "../Logo/Logo.js";

/** The logo and the product name, linking home. */
export function BrandLink() {
  return (
    <Link
      to="/"
      className=":uno: inline-flex items-center gap-2 text-lg font-bold tracking-widest text-text uppercase no-underline"
    >
      <Logo className=":uno: h-6 w-auto" />
      Kirigami
    </Link>
  );
}
