export function NavbarLogo() {
  return (
    <>
      <img
        src="/logos/REF/REF_RGB_logo_positive.png"
        alt="Climate-REF"
        className="dark:hidden h-10 w-auto"
      />
      <img
        src="/logos/REF/REF_RGB_logo_negative.png"
        alt="Climate-REF"
        className="hidden dark:block h-10 w-auto"
      />
    </>
  );
}
