import { LoginForm } from "../auth-forms";

export const metadata = { title: "Acceso barra" };

export default function LoginPage() {
  return (
    <>
      <h1 className="t-display text-ink">Acceso barra</h1>
      <p className="mt-2 mb-8 text-[15px] text-ink-2">Solo para el personal del bar.</p>
      <LoginForm />
    </>
  );
}
