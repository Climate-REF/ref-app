"""Dataset representations returned by the API."""

from pydantic import BaseModel, computed_field

from climate_ref import models
from climate_ref.models.dataset import CMIP6Dataset, CMIP7Dataset
from climate_ref.results.datasets import DatasetView
from climate_ref_core.source_types import SourceDatasetType
from ref_backend.core.source_types import mip_era_for


class CMIPDatasetMetadata(BaseModel):
    variable_id: str
    source_id: str
    experiment_id: str
    variant_label: str


class Dataset(BaseModel):
    id: int
    slug: str
    dataset_type: str
    metadata: CMIPDatasetMetadata | None
    #: The model era this dataset belongs to, or None for non-CMIP sources.
    mip_era: str | None = None

    @computed_field  # type: ignore
    @property
    def more_info_url(self) -> str | None:
        if "cmip6" in self.dataset_type:
            # Use the WDC service to look up the dataset
            return f"https://www.wdc-climate.de/ui/cmip6?input={self.slug}"
        return None

    @staticmethod
    def build(dataset: models.Dataset) -> "Dataset":
        metadata = None
        if isinstance(dataset, CMIP6Dataset | CMIP7Dataset):
            metadata = CMIPDatasetMetadata(
                variable_id=dataset.variable_id,
                source_id=dataset.source_id,
                experiment_id=dataset.experiment_id,
                variant_label=dataset.variant_label,
            )

        return Dataset(
            id=dataset.id,
            slug=dataset.slug,
            dataset_type=str(dataset.dataset_type),
            metadata=metadata,
            mip_era=mip_era_for(dataset.dataset_type),
        )

    @staticmethod
    def build_from_view(dataset: DatasetView) -> "Dataset":
        if dataset.dataset_type in (SourceDatasetType.CMIP6, SourceDatasetType.CMIP7):
            metadata = CMIPDatasetMetadata.model_validate(dataset.facets)
        else:
            metadata = None

        return Dataset(
            id=dataset.id,
            slug=dataset.slug,
            dataset_type=str(dataset.dataset_type),
            metadata=metadata,
            mip_era=mip_era_for(dataset.dataset_type),
        )
