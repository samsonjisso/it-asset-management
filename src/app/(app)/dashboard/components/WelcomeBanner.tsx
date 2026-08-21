interface WelcomeBannerProps {
  firstName?: string;
}

export function WelcomeBanner({ firstName }: WelcomeBannerProps) {
  return (
    <div className="gbb-dashboard-banner rounded-2xl p-6 text-white shadow-lg">
      <h1 className="text-2xl font-bold">Welcome back, {firstName}!</h1>
      <p className="text-white/80 mt-1">
        Here's your IT asset inventory overview
      </p>
    </div>
  );
}
