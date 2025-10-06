export function DataHealthWarning() {
  return (
    <p>
      Diagnostics in REF v1 that compare models with observations use only
      single reference datasets. In addition, many of the REF diagnostics
      currently operate on single model ensemble members. This means that the
      tool cannot yet support many different sources of uncertainty. This is an
      ambition for a future iteration of the tool.
    </p>
  );
}
