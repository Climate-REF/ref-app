# Collection YAML Files

This directory contains per-collection YAML files that provide display metadata for the CMIP7 Assessment Fast Track (AFT) diagnostic collections shown on the REF dashboard.

## File naming

Files are named `{id}_{short-name}.yaml`, e.g. `1-1_sea-ice-sensitivity.yaml`. The ID inside the file (not the filename) is what the loader uses, so filenames are purely for human readability.

`themes.yaml` maps collections into thematic groups for the explorer UI.

## Schema

Each collection YAML has the following structure:

```yaml
id: "1.1"                    # AFT diagnostic ID (must be unique across all files)
name: "Sea ice sensitivity to warming"  # Full display name
theme: "Oceans and sea ice"  # Thematic category
endorser: "CMIP Model Benchmarking Task Team"
version_control: "version 1 - 24-11-04 REF launch"
reference_dataset: "OSI SAF/CCI, HadCRUT"
provider_link: "https://..."  # Link to recipe/methodology docs

content:
  description: >-             # What this diagnostic is doing (for ESM community)
    ...
  short_description: >-       # Brief one-liner summary
    ...
  why_it_matters: >-          # Why this diagnostic is important (for ESM community)
    ...
  takeaway: >-                # What you should take away from the results (for ESM community)
    ...
  plain_language:              # Optional: simplified versions for non-specialist audiences
    description: >-
      ...
    why_it_matters: >-
      ...
    takeaway: >-
      ...

diagnostics:                  # Links to REF diagnostic implementations
  - provider_slug: esmvaltool
    diagnostic_slug: sea-ice-sensitivity

explorer_cards: []            # Card definitions for the data explorer UI
```

### Content fields

| Field | Purpose |
|---|---|
| `description` | What the diagnostic calculates and how (technical) |
| `short_description` | Brief summary, typically shown in listings |
| `why_it_matters` | Scientific importance and relevance |
| `takeaway` | What users should learn from the results |
| `plain_language.*` | Simplified versions of the above for non-ESM audiences |

All content fields are optional. Not every collection has all fields populated.

### Explorer cards

The `explorer_cards` list defines visualisation cards for the data explorer. See `backend/src/ref_backend/core/collections.py` for the full card schema (`AFTCollectionCardContent`). Supported card types:

- `box-whisker-chart` - Box and whisker plots for scalar metrics
- `series-chart` - Time series or seasonal cycle line charts
- `taylor-diagram` - Taylor diagrams for spatial performance
- `figure-gallery` - Gallery of pre-rendered figures

## Adding or editing a collection

1. Create or edit a YAML file in this directory following the schema above
2. Ensure the `id` field is unique and matches the AFT diagnostic numbering
3. If adding a new collection, add its ID to the appropriate theme in `themes.yaml`
4. Run `uv run pytest tests/test_api/test_api_explorer.py` to validate

The collection loader (`core/collections.py`) validates files on startup using Pydantic. Invalid files are skipped with a warning.

## Regenerating client types

After changing the content schema (adding new fields to the Pydantic models), regenerate the frontend TypeScript client:

```bash
make generate-client
```

This exports the OpenAPI schema from the backend and generates `frontend/src/client/`. Never edit generated client files by hand.
