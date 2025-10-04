import { LinkExternal } from "../ui/link";

const funders = [
  {
    name: "U.S. DOE",
    logo: "/logos/us-doe-light.svg",
    url: "https://www.energy.gov/",
  },
  {
    name: "ESA",
    logo: "/logos/esa-light.svg",
    url: "https://climate.esa.int/",
  },
];
const builders = [
  {
    name: "Climate Resource",
    url: "https://www.climateresource.com/",
  },
  {
    name: "Oak Ridge National Laboratory",
    url: "https://www.ornl.gov/",
  },
  {
    name: "CEDA",
    url: "https://www.ceda.ac.uk/",
  },
  {
    name: "Lawrence Livermore National Laboratory",
    url: "https://www.llnl.gov/",
  },
  {
    name: "DLR",
    url: "https://www.dlr.de/",
  },
  {
    name: "Netherlands eScience Center",
    url: "https://www.esciencecenter.nl/",
  },
];

const links = [
  {
    name: "GitHub",
    url: "https://github.com/Climate-REF",
  },
  {
    name: "Climate REF Docs",
    url: "https://climate-ref.readthedocs.io/en/latest/",
  },
  {
    name: "API Docs (WIP)",
    url: "https://api.climate-ref.org/docs",
  },
  {
    name: "Privacy Policy",
    url: "/content/privacy",
  },
  {
    name: "Terms of Use",
    url: "/content/terms-of-use",
  },
];

export const Footer = () => {
  return (
    <footer className="bg-muted dark:bg-gray-900  text-sm mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Climate REF Logo */}
          <div className="flex flex-col justify-items-center items-start gap-4">
            <div className="mx-auto">
              <a href="https://wcrp-cmip.org/">
                <img
                  className="dark:hidden h-20"
                  src="/logos/CMIP/CMIP_Logo_RGB_Positive.png"
                  alt="CMIP IPO"
                />
                <img
                  className="hidden dark:inline h-20"
                  src="/logos/CMIP/CMIP_Logo_RGB_Negative.png"
                  alt="CMIP IPO"
                />
              </a>
            </div>
            <div className="mx-auto">
              <a href="https://www.wcrp-esmo.org/">
                <img
                  className="dark:hidden  h-20"
                  src="/logos/ESMO/ESMO_RGB_logo-baseline_positive.png"
                  alt="ESMO IPO"
                />
                <img
                  className="hidden dark:inline  h-20"
                  src="/logos/ESMO/ESMO_RGB_logo-baseline_negative.png"
                  alt="ESMO IPO"
                />
              </a>
            </div>
          </div>

          {/* Three Columns: Funders, Builders, Links */}
          <div>
            <h3 className="text-muted-foreground font-semibold mb-4 text-md">
              Project Funders
            </h3>
            <div className="flex flex-col gap-4">
              <p>
                The REF is a community project developed by CMIP, a project of
                ESMO, which is a core project of the World Climate Research
                Programme (WCRP).
              </p>
              {funders.map((funder) => (
                <LinkExternal key={funder.name} href={funder.url}>
                  {funder.name}
                </LinkExternal>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-muted-foreground font-semibold mb-4">
              Development Partners
            </h3>
            <div className="flex flex-col gap-4">
              {builders.map((builder) => (
                <LinkExternal key={builder.name} href={builder.url}>
                  {builder.name}
                </LinkExternal>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-muted-foreground font-semibold mb-4">Links</h3>
            <div className="flex flex-col gap-4">
              {links.map((link) => (
                <LinkExternal key={link.name} href={link.url}>
                  {link.name}
                </LinkExternal>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 flex justify-center text-center gap-4">
          <p className="text-gray-500">Licensed under Apache 2.0.</p>
          <LinkExternal href="https://github.com/Climate-REF/ref-app">
            Website Source
          </LinkExternal>
        </div>
      </div>
    </footer>
  );
};
