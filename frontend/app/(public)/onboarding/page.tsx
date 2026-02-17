import Header from "../_components/Header";
import OnboardingCard from "../_components/OnboardingCard";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-white px-6 py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <Header />
        <OnboardingCard />
      </div>
    </div>
  );
}
