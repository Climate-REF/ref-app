export function NavbarLogo() {
  return (
    <div className="flex items-center justify-between gap-2 bg-white rounded p-1">
      <img
        src="/logos/logo_cmip_ref.png"
        alt="Rapid Evaluation Framework"
        className="w-12 h-10 min-w-12"
      />
      <h1 className="font-display font-medium text-md hidden md:inline text-black">
        Rapid Evaluation <br />
        Framework
      </h1>
    </div>
  );
}
