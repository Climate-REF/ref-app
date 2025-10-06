import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            p: {
              marginTop: "0",
            },
            h2: {
              marginTop: "1em",
            },
          },
        },
      },
    },
  },
};

export default config;
