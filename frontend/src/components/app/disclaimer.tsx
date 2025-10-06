import { Link } from "../ui/link";

export function Disclaimer() {
  return (
    <div className="space-y-2">
      <p className="text-sm text-red-600 dark:text-red-400">
        The content of the Rapid Evaluation Framework is under development. This
        experimental research tool is provided in its current state to solicit
        user feedback, with no guarantee of quality, performance, stability or
        functionality. Every effort is being made to identify and address errors
        and bugs. Users can assist by reporting these on the dedicated{" "}
        <Link to="https://github.com/Climate-REF/climate-ref">GitHub repo</Link>
        .
      </p>
      <p className="text-sm text-red-600 dark:text-red-400">
        WCRP and CMIP governing bodies, the CMIP International Project Office,
        the developers, and funders of the REF accept no responsibility for any
        injury, loss, damage, or delay - direct, indirect or consequential -
        that may result from the use of the tool or reliance on its results.
      </p>
    </div>
  );
}
