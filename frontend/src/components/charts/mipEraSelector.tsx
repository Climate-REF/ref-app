import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MIP_ERAS, type MipEra } from "@/lib/mipEras";

interface MipEraSelectorProps {
  mipEra: MipEra;
  onChange: (mipEra: MipEra) => void;
}

/**
 * Pick the MIP era every chart on the page reports.
 *
 * Only one era shows at a time, because CMIP6 and CMIP7 are not directly comparable.
 */
export function MipEraSelector({ mipEra, onChange }: MipEraSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <Tabs value={mipEra} onValueChange={(value) => onChange(value as MipEra)}>
        <TabsList>
          {MIP_ERAS.map((option) => (
            <TabsTrigger key={option} value={option}>
              {option}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <p className="text-sm text-muted-foreground">
        The two eras are shown separately, because the ensembles are not
        directly comparable.
      </p>
    </div>
  );
}
