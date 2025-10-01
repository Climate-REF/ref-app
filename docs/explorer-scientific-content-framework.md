# Climate REF Explorer - Scientific Content Framework

**Purpose:** This document provides a comprehensive framework for creating, reviewing, and maintaining scientific content in the Climate REF Explorer interface. It identifies content gaps, establishes standards, and provides examples for climate science experts to follow.

**Last Updated:** 2025-10-01
**Status:** Draft - Requires expert review and validation

---

## Table of Contents

1. [Content Gap Analysis](#content-gap-analysis)
2. [Content Framework Standards](#content-framework-standards)
3. [Content Templates](#content-templates)
4. [Example Content for Placeholder Sections](#example-content-for-placeholder-sections)
5. [Implementation Guidelines](#implementation-guidelines)
6. [Quality Assurance Checklist](#quality-assurance-checklist)

---

## 1. Content Gap Analysis

### 1.1 Sections Requiring Complete Content

The following explorer sections have been identified as placeholders requiring comprehensive scientific content:

#### **Ocean State** (Sea Theme)
- **Status:** Placeholder - Requires scientific context
- **Metrics:** AMOC Strength, Sea Surface Salinity, Sea Surface Temperature
- **Priority:** HIGH
- **Rationale:** Ocean state metrics are fundamental to understanding climate system heat storage and circulation patterns

#### **Cryosphere** (Sea Theme)
- **Status:** Placeholder - Requires scientific context
- **Metrics:** Sea Ice Area
- **Priority:** HIGH
- **Rationale:** Critical indicator of climate change with significant feedback mechanisms

#### **Cloud & Radiation** (Atmosphere Theme)
- **Status:** Placeholder - Minimal content
- **Metrics:** Cloud Radiative Effects
- **Priority:** HIGH
- **Rationale:** Clouds represent one of the largest uncertainties in climate models

#### **El Niño-Southern Oscillation** (Earth System Theme)
- **Status:** Placeholder - Requires expanded content
- **Metrics:** ENSO Basic Climatology, ENSO Teleconnections
- **Priority:** MEDIUM
- **Rationale:** Key driver of interannual climate variability

#### **Terrestrial Carbon Cycle** (Land Theme)
- **Status:** Placeholder - Requires scientific context
- **Metrics:** Gross Primary Production, Net Biome Production, Soil Carbon
- **Priority:** MEDIUM
- **Rationale:** Critical for understanding carbon-climate feedbacks

#### **Warming Levels** (Impact & Adaptation Theme)
- **Status:** Placeholder - Requires complete content
- **Metrics:** Global Mean Temperature Change at Warming Levels
- **Priority:** MEDIUM
- **Rationale:** Important for policy-relevant climate information

### 1.2 Sections with Adequate Content

These sections have sufficient scientific context but could benefit from enhancement:

- **Climate Sensitivity** (Earth System) - Has basic descriptions, could add interpretation guidance
- **Modes of Variability** (Atmosphere) - Good metric-level descriptions with references
- **Land Surface & Hydrology** (Land) - Has structure, needs scientific context

---

## 2. Content Framework Standards

### 2.1 Content Hierarchy

Scientific content in the Explorer follows a three-tier hierarchy:

```
Theme Level (e.g., "Atmosphere")
  ├── Section Level (e.g., "Cloud & Radiation")
  │   ├── Section description (brief scientific context)
  │   └── Metrics
  │       ├── Metric 1 (e.g., "Cloud Radiative Effects")
  │       │   ├── Metric title
  │       │   ├── Metric description (detailed scientific explanation)
  │       │   └── Units and interpretation guidance
  │       └── Metric 2...
```

### 2.2 Section-Level Content Requirements

Each section should include:

1. **Title** (5-10 words)
   - Clear, descriptive, uses standard terminology

2. **Description** (1-2 sentences, ~20-40 words)
   - Brief overview of the scientific domain
   - Explains why these metrics matter for climate science
   - Written for researchers who may not be domain experts

**Example:**
```typescript
{
  title: "Ocean State",
  description: "Key indicators of ocean health, circulation, and heat content.",
}
```

### 2.3 Metric-Level Content Requirements

Each metric should include:

1. **Title** (2-5 words)
   - Standard acronym or accepted terminology
   - Example: "AMOC Strength", "ECS", "NAM RMSE"

2. **Description** (2-4 sentences, ~40-100 words) [OPTIONAL but RECOMMENDED]
   - Physical meaning of the metric
   - Why it matters for climate science
   - How to interpret the values (what's "good" or "expected")
   - Any important caveats or limitations

3. **Units** (when applicable)
   - Standard SI or domain-specific units
   - Example: "Sv" (Sverdrup), "K" (Kelvin), "psu" (practical salinity unit)

4. **References** (when available)
   - DOI links to key papers
   - Use format: `https://doi.org/xxx`

**Example:**
```typescript
{
  type: "box-whisker-chart",
  provider: "pmp",
  diagnostic: "extratropical-modes-of-variability-nam",
  title: "NAM RMSE",
  description: "Northern Annular Mode (NAM) individual-model pattern RMSE. Lower values indicate better representation of the spatial pattern of variability. See https://doi.org/10.1007/s00382-018-4355-4",
  metricUnits: "hPa",
}
```

### 2.4 Writing Style Guidelines

**Audience:** Climate researchers who may not be experts in the specific sub-domain

**Tone:**
- Scientific but accessible
- Avoid jargon where possible
- Define acronyms on first use within each section
- Use active voice when possible

**Length:**
- Section descriptions: 20-40 words
- Metric descriptions: 40-100 words
- Be concise but complete

**Technical Level:**
- Assume graduate-level climate science knowledge
- Explain domain-specific terminology
- Include physical interpretation, not just mathematical definitions

---

## 3. Content Templates

### 3.1 Section Description Template

```
[Domain/Process] that [primary function/role]. [Why it matters for climate].
```

**Examples:**

✅ Good: "The exchange of carbon between the land surface and the atmosphere, regulating atmospheric CO₂ concentrations and climate feedbacks."

❌ Too vague: "Important land processes."

❌ Too technical: "The terrestrial carbon cycle encompasses autotrophic and heterotrophic respiration, primary productivity, and soil organic matter decomposition."

### 3.2 Metric Description Template

#### For Bias/Error Metrics:

```
[Full name of metric] ([acronym]). [Physical quantity being measured].
[How to interpret: e.g., "Lower values indicate better agreement with observations"].
[Optional: Important considerations or limitations].
[Reference if applicable].
```

**Example:**
"Atlantic Meridional Overturning Circulation (AMOC) strength bias relative to RAPID observations. The AMOC is a critical component of ocean heat transport, carrying warm surface waters northward and cold deep waters southward in the Atlantic. Positive bias indicates overestimation of circulation strength. Models typically show 5-20 Sv spread, with observations around 17 Sv at 26°N."

#### For Direct Physical Quantities:

```
[Physical quantity] [in region/context]. [Why this matters].
[Typical range or expected behavior].
[Optional: Known model biases or uncertainties].
```

**Example:**
"Sea surface temperature (SST) over the global ocean. SST is a key climate variable that influences atmospheric circulation, precipitation patterns, and ocean-atmosphere heat exchange. Observational estimates show global mean SST of approximately 18-19°C, with models generally capturing the spatial pattern but showing regional biases of 1-3 K."

#### For Climate Sensitivity Metrics:

```
[Full name] ([acronym]). [Definition in physical terms].
[Typical range from IPCC or literature].
[Interpretation guidance].
[Reference to key assessment].
```

**Example:**
"Equilibrium Climate Sensitivity (ECS). The equilibrium global mean surface temperature increase following a doubling of atmospheric CO₂ concentration. IPCC AR6 assesses ECS to be very likely in the range 2.0-5.0 K, with a best estimate of 3.0 K. Higher ECS values indicate stronger warming response to greenhouse gas forcing."

### 3.3 Units Reference Table

| Domain | Common Units | Symbol | Notes |
|--------|-------------|---------|-------|
| Temperature | Kelvin | K | Always use K, not °C, for model comparisons |
| Ocean Transport | Sverdrup | Sv | 1 Sv = 10⁶ m³/s |
| Salinity | Practical Salinity Unit | psu | Dimensionless, sometimes shown as g/kg |
| Carbon Flux | Petagrams per year | PgC/yr | 1 Pg = 10¹⁵ g |
| Carbon Density | Kilograms per square meter | kgC/m² | For carbon stocks |
| Sea Ice | Square kilometers | km² | For area; sometimes 10⁶ km² |
| Precipitation | Millimeters per day | mm/day | Or kg/m²/s in models |
| Radiation | Watts per square meter | W/m² | For fluxes |
| Pressure | Hectopascal | hPa | For atmospheric pressure |

---

## 4. Example Content for Placeholder Sections

The following sections provide scientifically accurate example content for the identified placeholder sections. **These examples require review and validation by domain experts before implementation.**

### 4.1 Ocean State (Sea Theme)

**Section-Level Content:**

```typescript
{
  title: "Ocean State",
  description: "Key indicators of ocean circulation, heat content, and salinity that regulate climate on multiple timescales and transport heat globally.",
  placeholder: false, // Remove after content review
}
```

**Metric 1: AMOC Strength**

```typescript
{
  type: "box-whisker-chart",
  provider: "ilamb",
  diagnostic: "amoc-rapid",
  title: "AMOC Strength",
  description: "Atlantic Meridional Overturning Circulation (AMOC) strength at 26°N. The AMOC transports warm surface waters northward and cold deep waters southward, playing a critical role in regional climate, particularly in the North Atlantic and Europe. The metric shown is the bias relative to RAPID array observations (2004-present), which measure approximately 17 Sv. Models typically range from 10-25 Sv, with biases indicating potential issues in representing deep water formation or vertical mixing. Weakening AMOC is projected under climate change with implications for regional temperature and precipitation patterns.",
  metricUnits: "Sv",
  groupingConfig: {
    groupBy: "statistic",
    hue: "statistic",
  },
  otherFilters: {
    region: "None",
    metric: "Bias",
    statistic: "Period Mean",
  },
}
```

**Metric 2: Sea Surface Salinity**

```typescript
{
  type: "box-whisker-chart",
  provider: "ilamb",
  diagnostic: "so-woa2023-surface",
  title: "Sea Surface Salinity",
  description: "Sea surface salinity (SSS) compared to World Ocean Atlas 2023 observations. SSS patterns reflect the balance of evaporation, precipitation, river runoff, and ocean circulation. Typical global mean values are 34-35 psu, with subtropical gyres showing higher salinity (>36 psu) due to excess evaporation, and high-latitude regions showing lower values (<33 psu) due to precipitation and freshwater input. Model biases in SSS can indicate problems with freshwater forcing, ocean mixing, or the hydrological cycle representation. Regional SSS patterns are important for ocean stratification and deep water formation.",
  metricUnits: "psu",
  groupingConfig: {
    groupBy: "statistic",
    hue: "statistic",
  },
  otherFilters: {
    region: "None",
    metric: "Bias",
    statistic: "Period Mean",
  },
}
```

**Metric 3: Sea Surface Temperature**

```typescript
{
  type: "box-whisker-chart",
  provider: "ilamb",
  diagnostic: "thetao-woa2023-surface",
  title: "Sea Surface Temperature",
  description: "Sea surface temperature (SST) bias relative to World Ocean Atlas 2023 observations. SST is a fundamental climate variable influencing air-sea heat exchange, atmospheric circulation patterns, and marine ecosystems. Global mean SST is approximately 18-19°C, with regional variations from -2°C in polar regions to >30°C in the warm pool regions. Common model biases include cold bias in eastern boundary upwelling systems and warm bias in the Southern Ocean. SST biases can affect atmospheric model performance through air-sea coupling and have implications for regional climate, ENSO simulation, and tropical cyclone activity.",
  metricUnits: "K",
  groupingConfig: {
    groupBy: "statistic",
    hue: "statistic",
  },
  otherFilters: {
    region: "None",
    metric: "Bias",
    statistic: "Period Mean",
  },
}
```

**Expert Review Needed:**
- Validate AMOC typical values and observation period
- Verify SSS unit conventions (psu vs g/kg)
- Confirm typical SST ranges and common bias patterns
- Add references to key papers on ocean state metrics

### 4.2 Cryosphere (Sea Theme)

**Section-Level Content:**

```typescript
{
  title: "Cryosphere",
  description: "Sea ice extent and volume metrics that reflect polar amplification of climate change and drive important climate feedbacks through surface albedo changes.",
  placeholder: false, // Remove after content review
}
```

**Metric: Sea Ice Area**

```typescript
{
  type: "box-whisker-chart",
  provider: "esmvaltool",
  diagnostic: "sea-ice-area-basic",
  title: "Sea Ice Area",
  description: "Sea ice area (SIA) is the total extent of ocean covered by sea ice, typically reported separately for Arctic and Antarctic regions and by season. Observed Arctic SIA has declined dramatically (approximately 13% per decade in September minimum since 1979), while Antarctic trends are more complex with regional variations. Models show substantial spread in simulating both mean state and trends, with many models underestimating observed Arctic decline. Sea ice area is crucial because it affects surface albedo (ice-albedo feedback), ocean-atmosphere heat exchange, and polar amplification. Metrics may include mean state bias, seasonal cycle amplitude, and trend comparisons against satellite observations.",
  metricUnits: "10^6 km²",
  groupingConfig: {
    groupBy: "metric",
    hue: "metric",
  },
}
```

**Expert Review Needed:**
- Verify Arctic decline rate (13% per decade)
- Confirm Antarctic sea ice behavior and trends
- Validate typical model performance characteristics
- Add references to recent assessments (IPCC AR6, etc.)
- Consider adding volume vs area distinction if relevant

### 4.3 Cloud & Radiation (Atmosphere Theme)

**Section-Level Content:**

```typescript
{
  title: "Cloud & Radiation",
  description: "Cloud properties and radiative effects that represent one of the largest uncertainties in climate model projections due to complex microphysical and dynamical processes.",
  placeholder: false, // Remove after content review
}
```

**Metric: Cloud Radiative Effects**

```typescript
{
  type: "box-whisker-chart",
  provider: "esmvaltool",
  diagnostic: "cloud-radiative-effects",
  title: "Cloud Radiative Effects",
  description: "Cloud radiative effect (CRE), also called cloud radiative forcing, quantifies the impact of clouds on Earth's radiation budget. It is calculated as the difference between all-sky and clear-sky net radiative fluxes at the top of atmosphere. Globally, the net CRE is approximately -20 W/m², indicating a cooling effect. This net value results from opposing shortwave (SW) cooling (approximately -50 W/m² due to reflected sunlight) and longwave (LW) warming (approximately +30 W/m² due to greenhouse effect). Regional CRE patterns depend on cloud types, optical depth, and altitude. Model biases in CRE often indicate problems with cloud amount, vertical distribution, or optical properties, with important implications for climate sensitivity and regional climate projections.",
  metricUnits: "W/m²",
  otherFilters: { statistic: "bias" },
  groupingConfig: {
    groupBy: "metric",
    hue: "metric",
  },
}
```

**Expert Review Needed:**
- Verify global mean CRE values (~-20 W/m² net)
- Confirm SW and LW components
- Validate relationship to climate sensitivity
- Add references to key cloud feedback studies
- Consider mentioning specific cloud regimes if relevant to diagnostic

### 4.4 El Niño-Southern Oscillation (Earth System Theme)

**Enhanced Section-Level Content:**

```typescript
{
  title: "El Niño-Southern Oscillation",
  description: "Characteristics of ENSO, the dominant mode of interannual climate variability, which influences global weather patterns, precipitation, and temperature extremes.",
  placeholder: false, // Remove after content review
}
```

**Metric 1: ENSO Basic Climatology**

```typescript
{
  type: "box-whisker-chart",
  provider: "esmvaltool",
  diagnostic: "enso-basic-climatology",
  title: "ENSO Basic Climatology",
  description: "Basic climatological metrics of ENSO variability in the tropical Pacific, including the amplitude, spatial pattern, and temporal characteristics of sea surface temperature variability. Key metrics include the standard deviation of SST anomalies in the Niño 3.4 region (5°N-5°S, 170°W-120°W), which typically ranges from 0.8-1.2 K in observations. Models often struggle with ENSO amplitude, period, and asymmetry between El Niño and La Niña events. Accurate ENSO representation is crucial as it affects global teleconnections and seasonal predictability.",
  groupingConfig: {
    groupBy: "metric",
    hue: "metric",
  },
  otherFilters: { region: "global" },
}
```

**Metric 2: ENSO Teleconnections**

```typescript
{
  type: "box-whisker-chart",
  provider: "pmp",
  diagnostic: "enso_tel",
  title: "ENSO Teleconnections",
  description: "ENSO teleconnections represent the far-reaching impacts of tropical Pacific SST variability on global climate patterns through atmospheric circulation changes. These include effects on North American winter climate, Indian monsoon, Australian rainfall, and Atlantic hurricane activity. Metrics assess how well models capture the spatial patterns and strength of these remote influences, typically evaluated through correlation or regression patterns. Proper representation of teleconnections is essential for seasonal prediction and understanding regional climate variability and change.",
  groupingConfig: {
    groupBy: "metric",
    hue: "metric",
  },
}
```

**Expert Review Needed:**
- Verify Niño 3.4 region definition and typical variability
- Validate key teleconnection patterns mentioned
- Add specific references to ENSO evaluation studies
- Consider mentioning diversity of ENSO events if relevant

### 4.5 Terrestrial Carbon Cycle (Land Theme)

**Enhanced Section-Level Content:**

```typescript
{
  title: "Terrestrial Carbon Cycle",
  description: "The exchange of carbon between land ecosystems and the atmosphere, including photosynthesis, respiration, and soil carbon storage, which critically influence atmospheric CO₂ concentrations and climate feedbacks.",
  placeholder: false, // Remove after content review
}
```

**Metric 1: Gross Primary Production**

```typescript
{
  type: "box-whisker-chart",
  provider: "ilamb",
  diagnostic: "gpp-fluxnet2015",
  title: "Gross Primary Production",
  description: "Gross Primary Production (GPP) is the total amount of carbon fixed by photosynthesis in terrestrial ecosystems. Global GPP is approximately 120 PgC/yr based on FLUXNET tower observations and satellite-derived estimates, with largest values in tropical forests (>2500 gC/m²/yr) and lowest in deserts and polar regions. Model evaluation focuses on spatial patterns, seasonal cycles, and interannual variability. GPP biases often indicate problems with vegetation distribution, leaf area index, or climate forcing. Accurate GPP simulation is fundamental for carbon cycle projections and carbon-concentration and carbon-climate feedback quantification.",
  metricUnits: "gC/m²/yr",
  otherFilters: { region: "global" },
  groupingConfig: {
    groupBy: "metric",
    hue: "metric",
  },
}
```

**Metric 2: Net Biome Production**

```typescript
{
  type: "box-whisker-chart",
  provider: "ilamb",
  diagnostic: "nbp-hoffman",
  title: "Net Biome Production",
  description: "Net Biome Production (NBP) represents the net carbon exchange between land and atmosphere, accounting for photosynthesis, respiration, disturbances (fire, harvest), and other losses. Observational estimates suggest NBP varies from a small source to a moderate sink (approximately 0-3 PgC/yr land sink) with large interannual variability driven by climate variations and disturbances. NBP is critical for understanding the land carbon sink that currently removes about 30% of anthropogenic CO₂ emissions. Model spread in NBP indicates uncertainties in disturbance processes, climate sensitivity of ecosystems, and carbon-climate feedbacks.",
  metricUnits: "PgC/yr",
  clipMax: 2000,
  groupingConfig: {
    groupBy: "metric",
    hue: "metric",
  },
}
```

**Metric 3: Soil Carbon**

```typescript
{
  type: "box-whisker-chart",
  provider: "ilamb",
  diagnostic: "csoil-hwsd2",
  title: "Soil Carbon",
  description: "Soil organic carbon (SOC) stocks represent the largest terrestrial carbon reservoir, with global estimates around 1500-2400 PgC in the top 1-2 meters. SOC distribution varies with climate, vegetation, and soil properties, with highest densities in peatlands, permafrost regions, and tropical soils. Model evaluation against databases like HWSD2 (Harmonized World Soil Database) assesses spatial patterns and total stocks. Uncertainty in SOC representation affects projections of carbon-climate feedbacks, particularly regarding permafrost thaw and enhanced decomposition under warming. SOC response to climate change remains a major uncertainty in Earth system models.",
  metricUnits: "kgC/m²",
  groupingConfig: {
    groupBy: "metric",
    hue: "metric",
  },
}
```

**Expert Review Needed:**
- Verify global GPP estimate (~120 PgC/yr)
- Confirm NBP range and typical sink strength
- Validate soil carbon stocks (1500-2400 PgC)
- Add references to key carbon cycle papers and IPCC assessments
- Consider mentioning specific databases used (FLUXNET, HWSD2)

### 4.6 Warming Levels (Impact & Adaptation Theme)

**Enhanced Section-Level Content:**

```typescript
{
  title: "Warming Levels",
  description: "Climate conditions at specific global warming levels relative to pre-industrial, directly relevant to Paris Agreement targets and impact assessments across sectors.",
  placeholder: false, // Remove after content review
}
```

**Metric: Global Mean Temperature Change at Warming Levels**

```typescript
{
  type: "box-whisker-chart",
  provider: "esmvaltool",
  diagnostic: "climate-at-global-warming-level",
  title: "Global Mean Temperature Change",
  description: "Global mean surface temperature (GMST) change relative to 1850-1900 baseline at specific warming levels (e.g., 1.5°C, 2°C, 3°C, 4°C). These warming levels correspond to Paris Agreement targets and are used to assess climate impacts and adaptation needs. Analysis shows when different models reach each warming level and the pattern of regional climate changes at that level. Current observations show approximately 1.1°C warming as of 2011-2020. The spread across models at a given warming level reflects uncertainties in regional climate responses even when global temperature is constrained. This framework enables policy-relevant comparisons of climate impacts across scenarios and models.",
  metricUnits: "K",
  placeholder: true, // Keep until diagnostic is fully implemented
}
```

**Expert Review Needed:**
- Verify current observed warming level (~1.1°C for 2011-2020)
- Confirm typical warming levels evaluated (1.5, 2, 3, 4°C)
- Add references to IPCC Special Report on 1.5°C
- Validate Paris Agreement target details

---

## 5. Implementation Guidelines

### 5.1 Where Content Lives

Content is implemented in TypeScript files within the frontend:

**Location:** `frontend/src/components/explorer/theme/`

**Files:**
- `earthSystem.tsx` - Earth System theme
- `atmosphere.tsx` - Atmosphere theme
- `sea.tsx` - Sea (Ocean) theme
- `land.tsx` - Land theme
- `impactAndAdaptation.tsx` - Impact & Adaptation theme

### 5.2 Implementation Process

1. **Review Example Content**
   - Have domain experts review the example content in Section 4
   - Verify scientific accuracy
   - Check for missing important caveats
   - Validate typical values and ranges

2. **Update TypeScript Files**
   - Add `description` fields to metrics following the templates
   - Update section descriptions as needed
   - Remove `placeholder: true` flags after review
   - Ensure units are correct

3. **Test in Browser**
   - View changes in the Explorer interface
   - Verify descriptions display correctly
   - Check that technical level is appropriate
   - Ensure descriptions fit in UI without excessive scrolling

4. **Iterate Based on User Feedback**
   - Collect feedback from researchers using the tool
   - Refine descriptions for clarity
   - Add references as needed

### 5.3 Code Example

```typescript
{
  title: "Your Section Title",
  description: "Brief scientific context following template.",
  placeholder: false, // Only remove after expert review
  content: [
    {
      type: "box-whisker-chart",
      provider: "diagnostic-provider",
      diagnostic: "diagnostic-slug",
      title: "Metric Name",
      description: "Detailed metric description following guidelines. Include physical meaning, typical values, interpretation guidance, and caveats. Add references if available.",
      metricUnits: "units",
      groupingConfig: {
        groupBy: "facet",
        hue: "facet",
      },
      otherFilters: { /* ... */ },
    },
  ],
}
```

### 5.4 Version Control

- Create a feature branch for content updates: `feat/explorer-content-{theme}`
- Commit changes with clear messages: `feat: Add scientific context to Ocean State metrics`
- Request review from domain experts before merging
- Document major content changes in CHANGELOG or commit messages

---

## 6. Quality Assurance Checklist

Before finalizing content, verify:

### Scientific Accuracy
- [ ] Physical explanations are correct
- [ ] Typical values/ranges are accurate
- [ ] Units are correct and clearly stated
- [ ] Important caveats are mentioned
- [ ] References are valid and accessible

### Clarity
- [ ] Content is accessible to non-expert climate scientists
- [ ] Jargon is defined or avoided
- [ ] Acronyms are spelled out on first use
- [ ] Sentences are concise and clear

### Completeness
- [ ] All placeholder sections have content
- [ ] Section descriptions provide context
- [ ] Metric descriptions explain "why it matters"
- [ ] Interpretation guidance is provided (what values mean)

### Consistency
- [ ] Writing style matches guidelines
- [ ] Length guidelines are followed (20-40 words for sections, 40-100 for metrics)
- [ ] Terminology is consistent across themes
- [ ] Format matches templates

### Technical
- [ ] Code compiles without errors
- [ ] Content displays correctly in UI
- [ ] Links/references work
- [ ] Placeholder flags removed after review

### Review
- [ ] Content reviewed by domain expert
- [ ] Feedback incorporated
- [ ] Changes documented
- [ ] Approved for implementation

---

## 7. References and Resources

### Key Climate Science References

1. **IPCC AR6 Working Group I Report** (2021)
   - Chapter 3: Human Influence on Climate
   - Chapter 7: Earth's Energy Budget
   - Chapter 9: Ocean, Cryosphere and Sea Level Change
   - https://www.ipcc.ch/report/ar6/wg1/

2. **IPCC Special Report on 1.5°C** (2018)
   - https://www.ipcc.ch/sr15/

3. **CMIP6 Model Evaluation Studies**
   - Eyring et al. (2021): Overview of CMIP6 results
   - https://doi.org/10.5194/gmd-14-5087-2021

### Observational Datasets Referenced

- **World Ocean Atlas 2023:** Ocean temperature and salinity climatology
- **RAPID Array:** AMOC observations at 26°N
- **FLUXNET2015:** Terrestrial flux measurements
- **HWSD2:** Harmonized World Soil Database

### Model Evaluation Frameworks

- **ILAMB:** International Land Model Benchmarking
- **ESMValTool:** Earth System Model Evaluation Tool
- **PMP:** PCMDI Metrics Package

---

## 8. Maintenance and Updates

### Regular Review Cycle

- **Quarterly:** Review new scientific literature for updated typical values
- **Annually:** Major content review with domain experts
- **As Needed:** Updates when new observations or assessments become available (e.g., new IPCC reports)

### Tracking Changes

Maintain a change log for significant content updates:

```
## Content Change Log

### 2025-10-01 - Initial Framework
- Created comprehensive content framework
- Added example content for Ocean State, Cryosphere, Cloud & Radiation
- Established templates and guidelines

### [Future Date] - Expert Review
- Domain expert review of Ocean State content
- Validated AMOC typical values
- Added references to key papers
```

### Contact for Questions

For questions about scientific content:
- **Ocean/Sea content:** [Ocean science expert contact]
- **Atmosphere content:** [Atmosphere science expert contact]
- **Land content:** [Land science expert contact]
- **General framework:** [Project lead contact]

---

## Appendix A: Common Metrics and Their Meanings

### Climate Sensitivity Metrics

| Metric | Full Name | Definition | Typical Range |
|--------|-----------|------------|---------------|
| ECS | Equilibrium Climate Sensitivity | Temperature increase at 2×CO₂ equilibrium | 2.0-5.0 K (likely) |
| TCR | Transient Climate Response | Temperature increase at 2×CO₂ (1% yr⁻¹ increase) | 1.4-2.2 K (likely) |
| TCRE | Transient Climate Response to Emissions | Temperature change per cumulative CO₂ emissions | 1.0-2.3 K/EgC |
| ZEC | Zero Emission Commitment | Temperature change after emissions cease | -0.3 to 0.3 K |

### Ocean Metrics

| Metric | Full Name | Units | Typical Values |
|--------|-----------|-------|----------------|
| AMOC | Atlantic Meridional Overturning Circulation | Sv | 10-25 Sv (models), ~17 Sv (obs at 26°N) |
| SST | Sea Surface Temperature | K or °C | 18-19°C (global mean) |
| SSS | Sea Surface Salinity | psu | 34-35 psu (global mean) |

### Carbon Cycle Metrics

| Metric | Full Name | Units | Typical Values |
|--------|-----------|-------|----------------|
| GPP | Gross Primary Production | PgC/yr or gC/m²/yr | ~120 PgC/yr (global) |
| NBP | Net Biome Production | PgC/yr | 0-3 PgC/yr (land sink) |
| SOC | Soil Organic Carbon | kgC/m² or PgC | 1500-2400 PgC (global) |

### Radiation Metrics

| Metric | Full Name | Units | Typical Values |
|--------|-----------|-------|----------------|
| CRE | Cloud Radiative Effect | W/m² | -20 W/m² (net global) |
| SW CRE | Shortwave Cloud Radiative Effect | W/m² | -50 W/m² (cooling) |
| LW CRE | Longwave Cloud Radiative Effect | W/m² | +30 W/m² (warming) |

---

## Appendix B: Glossary of Terms

**Bias:** The systematic difference between model output and observations. Positive bias means model values are higher than observed.

**CMIP6:** Coupled Model Intercomparison Project Phase 6, the latest coordinated climate model comparison effort.

**Climatology:** Long-term average of climate variables, typically 30 years.

**Feedback:** A process that amplifies (positive feedback) or dampens (negative feedback) the climate system's response to forcing.

**RMSE:** Root Mean Square Error, a measure of the difference between model and observations accounting for both bias and pattern errors.

**Teleconnection:** A statistical correlation between climate variables at distant locations, often indicating a physical connection through atmospheric or oceanic circulation.

**Temporal Resolution:** The time interval between data points (e.g., daily, monthly, annual).

**Spatial Resolution:** The grid size or detail level of spatial data (e.g., 1° × 1° grid).

---

**End of Framework Document**

**Next Steps:**
1. Distribute to domain experts for review of example content (Section 4)
2. Iterate on scientific accuracy and clarity
3. Implement reviewed content in codebase
4. Test with research users
5. Establish regular update schedule
