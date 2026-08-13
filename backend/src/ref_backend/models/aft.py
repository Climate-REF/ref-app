"""CMIP7 Assessment Fast Track diagnostic metadata."""

from pydantic import BaseModel, HttpUrl


class AFTDiagnosticBase(BaseModel):
    """CMIP7 Assessment Fast Track (AFT) diagnostic metadata.

    This represents the diagnostic metadata as defined by the Model Benchmarking Task Team,
    and approved by CMIP Panel.
    """

    id: str
    name: str
    theme: str | None
    version_control: str | None
    reference_dataset: str | None
    endorser: str | None
    provider_link: HttpUrl | None
    description: str | None
    short_description: str | None


class AFTDiagnosticSummary(AFTDiagnosticBase):
    pass


class RefDiagnosticLink(BaseModel):
    """Link to a specific diagnostic calculated by a provider."""

    provider_slug: str
    diagnostic_slug: str


class AFTDiagnosticDetail(AFTDiagnosticBase):
    diagnostics: list[RefDiagnosticLink]
