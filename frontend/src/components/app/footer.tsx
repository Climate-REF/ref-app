const funders = [
  {
    name: "U.S. DOE",
    logo: "/logos/us-doe-light.svg",
    url: "https://www.energy.gov/",
  },
  {
    name: "ESA",
    logo: "/logos/esa-light.svg",
    url: "https://www.esa.int/",
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Climate REF Logo */}
          <div>
            <div className="p-1 bg-white rounded mx-auto h-16 w-16">
              <img src="/logos/logo_cmip_ref.png" alt="Climate REF logo" />
            </div>
          </div>

          {/* Three Columns: Funders, Builders, Links */}
          <div>
            <h3 className="text-muted-foreground font-semibold mb-4">
              Project Funders
            </h3>
            <div className="flex flex-col gap-4">
              {funders.map((funder) => (
                <a
                  key={funder.name}
                  href={funder.url}
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none hover:underline hover:underline-offset-4"
                >
                  {funder.name}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-muted-foreground font-semibold mb-4">
              Development Partners
            </h3>
            <div className="flex flex-col gap-4">
              {builders.map((builder) => (
                <a
                  key={builder.name}
                  href={builder.url}
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none hover:underline hover:underline-offset-4"
                >
                  {builder.name}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-muted-foreground font-semibold mb-4">Links</h3>
            <div className="flex flex-col gap-4">
              {links.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none hover:underline hover:underline-offset-4"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 flex justify-center text-center gap-4">
          <p className="text-gray-500">Licensed under Apache 2.0.</p>
          <a
            className="text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none hover:underline hover:underline-offset-4"
            href="https://github.com/Climate-REF/ref-app"
          >
            Website Source
          </a>
        </div>
      </div>
    </footer>
  );
};
