// This file is auto-generated by @hey-api/openapi-ts

export type Cmip6DatasetMetadata = {
    variable_id: string;
    source_id: string;
    experiment_id: string;
    variant_label: string;
};

export type CollectionMetricExecution = {
    data: Array<MetricExecution>;
};

export type CollectionMetricSummary = {
    data: Array<MetricSummary>;
};

export type Dataset = {
    id: number;
    slug: string;
    dataset_type: string;
    metadata: Cmip6DatasetMetadata | null;
};

export type DatasetCollection = {
    data: Array<Dataset>;
    count: number;
};

export type HttpValidationError = {
    detail?: Array<ValidationError>;
};

export type MetricExecution = {
    id: number;
    key: string;
    results: Array<MetricExecutionResult>;
    latest_result: MetricExecutionResult | null;
    outputs: Array<ResultOutput>;
    metric: MetricSummary;
};

export type MetricExecutionResult = {
    id: number;
    dataset_hash: string;
    successful: boolean;
    created_at: string;
    updated_at: string;
};

export type MetricExecutions = {
    data: Array<MetricExecution>;
    count: number;
};

/**
 * A unique provider
 */
export type MetricSummary = {
    id: number;
    provider: ProviderSummary;
    slug: string;
    name: string;
    metric_executions: Array<number>;
};

/**
 * Summary information about a Metric Provider.
 *
 * The metric provider is the framework that was used to generate a set of metrics.
 */
export type ProviderSummary = {
    slug: string;
    name: string;
};

export type ResultOutput = {
    id: number;
    output_type: ResultOutputType;
    filename: string;
    short_name: string;
    long_name: string;
    description: string;
    url?: string | null;
};

/**
 * Types of supported outputs
 *
 * These map to the categories of output in the CMEC output bundle
 */
export type ResultOutputType = 'plot' | 'data' | 'html';

export type ValidationError = {
    loc: Array<string | number>;
    msg: string;
    type: string;
};

export type MetricsListMetricsData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/api/v1/metrics/';
};

export type MetricsListMetricsResponses = {
    /**
     * Successful Response
     */
    200: CollectionMetricSummary;
};

export type MetricsListMetricsResponse = MetricsListMetricsResponses[keyof MetricsListMetricsResponses];

export type MetricsGetMetricData = {
    body?: never;
    path: {
        provider_slug: string;
        metric_slug: string;
    };
    query?: never;
    url: '/api/v1/metrics/{provider_slug}/{metric_slug}';
};

export type MetricsGetMetricErrors = {
    /**
     * Validation Error
     */
    422: HttpValidationError;
};

export type MetricsGetMetricError = MetricsGetMetricErrors[keyof MetricsGetMetricErrors];

export type MetricsGetMetricResponses = {
    /**
     * Successful Response
     */
    200: MetricSummary;
};

export type MetricsGetMetricResponse = MetricsGetMetricResponses[keyof MetricsGetMetricResponses];

export type MetricsGetMetricExecutionsData = {
    body?: never;
    path: {
        provider_slug: string;
        metric_slug: string;
    };
    query?: never;
    url: '/api/v1/metrics/{provider_slug}/{metric_slug}/executions';
};

export type MetricsGetMetricExecutionsErrors = {
    /**
     * Validation Error
     */
    422: HttpValidationError;
};

export type MetricsGetMetricExecutionsError = MetricsGetMetricExecutionsErrors[keyof MetricsGetMetricExecutionsErrors];

export type MetricsGetMetricExecutionsResponses = {
    /**
     * Successful Response
     */
    200: CollectionMetricExecution;
};

export type MetricsGetMetricExecutionsResponse = MetricsGetMetricExecutionsResponses[keyof MetricsGetMetricExecutionsResponses];

export type ExecutionsListExecutionsData = {
    body?: never;
    path?: never;
    query?: {
        limit?: number;
    };
    url: '/api/v1/executions/';
};

export type ExecutionsListExecutionsErrors = {
    /**
     * Validation Error
     */
    422: HttpValidationError;
};

export type ExecutionsListExecutionsError = ExecutionsListExecutionsErrors[keyof ExecutionsListExecutionsErrors];

export type ExecutionsListExecutionsResponses = {
    /**
     * Successful Response
     */
    200: MetricExecutions;
};

export type ExecutionsListExecutionsResponse = ExecutionsListExecutionsResponses[keyof ExecutionsListExecutionsResponses];

export type ExecutionsGetExecutionData = {
    body?: never;
    path: {
        execution_id: number;
    };
    query?: never;
    url: '/api/v1/executions/{execution_id}';
};

export type ExecutionsGetExecutionErrors = {
    /**
     * Validation Error
     */
    422: HttpValidationError;
};

export type ExecutionsGetExecutionError = ExecutionsGetExecutionErrors[keyof ExecutionsGetExecutionErrors];

export type ExecutionsGetExecutionResponses = {
    /**
     * Successful Response
     */
    200: MetricExecution;
};

export type ExecutionsGetExecutionResponse = ExecutionsGetExecutionResponses[keyof ExecutionsGetExecutionResponses];

export type ExecutionsGetExecutionResultData = {
    body?: never;
    path: {
        execution_id: number;
        result_id: number;
    };
    query?: never;
    url: '/api/v1/executions/{execution_id}/result/{result_id}';
};

export type ExecutionsGetExecutionResultErrors = {
    /**
     * Validation Error
     */
    422: HttpValidationError;
};

export type ExecutionsGetExecutionResultError = ExecutionsGetExecutionResultErrors[keyof ExecutionsGetExecutionResultErrors];

export type ExecutionsGetExecutionResultResponses = {
    /**
     * Successful Response
     */
    200: MetricExecutionResult;
};

export type ExecutionsGetExecutionResultResponse = ExecutionsGetExecutionResultResponses[keyof ExecutionsGetExecutionResultResponses];

export type ExecutionsGetExecutionResultDatasetsData = {
    body?: never;
    path: {
        execution_id: number;
        result_id: number;
    };
    query?: never;
    url: '/api/v1/executions/{execution_id}/result/{result_id}/datasets';
};

export type ExecutionsGetExecutionResultDatasetsErrors = {
    /**
     * Validation Error
     */
    422: HttpValidationError;
};

export type ExecutionsGetExecutionResultDatasetsError = ExecutionsGetExecutionResultDatasetsErrors[keyof ExecutionsGetExecutionResultDatasetsErrors];

export type ExecutionsGetExecutionResultDatasetsResponses = {
    /**
     * Successful Response
     */
    200: DatasetCollection;
};

export type ExecutionsGetExecutionResultDatasetsResponse = ExecutionsGetExecutionResultDatasetsResponses[keyof ExecutionsGetExecutionResultDatasetsResponses];

export type ResultsGetResultData = {
    body?: never;
    path: {
        result_id: number;
    };
    query?: never;
    url: '/api/v1/results/{result_id}';
};

export type ResultsGetResultErrors = {
    /**
     * Validation Error
     */
    422: HttpValidationError;
};

export type ResultsGetResultError = ResultsGetResultErrors[keyof ResultsGetResultErrors];

export type ResultsGetResultResponses = {
    /**
     * Successful Response
     */
    200: unknown;
};

export type UtilsHealthCheckData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/api/v1/utils/health-check/';
};

export type UtilsHealthCheckResponses = {
    /**
     * Successful Response
     */
    200: boolean;
};

export type UtilsHealthCheckResponse = UtilsHealthCheckResponses[keyof UtilsHealthCheckResponses];

export type ClientOptions = {
    baseUrl: `${string}://${string}` | (string & {});
};