"""Dataset representations returned by the API."""

from pydantic import BaseModel, computed_field

from climate_ref import models
from climate_ref.models.dataset import CMIP6Dataset


class CMIP6DatasetMetadata(BaseModel):
    variable_id: str
    source_id: str
    experiment_id: str
    variant_label: str


class Dataset(BaseModel):
    id: int
    slug: str
    dataset_type: str
    metadata: CMIP6DatasetMetadata | None

    @computed_field  # type: ignore
    @property
    def more_info_url(self) -> str | None:
        if "cmip6" in self.dataset_type:
            # Use the WDC service to look up the dataset
            return f"https://www.wdc-climate.de/ui/cmip6?input={self.slug}"
        return None

    @staticmethod
    def build(dataset: models.Dataset) -> "Dataset":
        if isinstance(dataset, CMIP6Dataset):
            metadata = CMIP6DatasetMetadata(
                variable_id=dataset.variable_id,
                source_id=dataset.source_id,
                experiment_id=dataset.experiment_id,
                variant_label=dataset.variant_label,
            )
        else:
            metadata = None

        return Dataset(
            id=dataset.id,
            slug=dataset.slug,
            dataset_type=str(dataset.dataset_type),
            metadata=metadata,
        )
