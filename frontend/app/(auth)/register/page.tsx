import { Suspense } from "react";
import RegisterForm from "../_components/RegisterForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}








