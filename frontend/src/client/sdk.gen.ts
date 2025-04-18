// This file is auto-generated by @hey-api/openapi-ts

import type { Options as ClientOptions, TDataShape, Client } from '@hey-api/client-fetch';
import type { MetricsListMetricsData, MetricsListMetricsResponse, MetricsGetMetricData, MetricsGetMetricResponse, MetricsGetMetricError, MetricsGetMetricExecutionsData, MetricsGetMetricExecutionsResponse, MetricsGetMetricExecutionsError, MetricsListMetricValuesData, MetricsListMetricValuesResponse, MetricsListMetricValuesError, ExecutionsListData, ExecutionsListResponse, ExecutionsListError, ExecutionsGetData, ExecutionsGetResponse, ExecutionsGetError, ExecutionsResultData, ExecutionsResultResponse, ExecutionsResultError, ExecutionsResultDatasetsData, ExecutionsResultDatasetsResponse, ExecutionsResultDatasetsError, ExecutionsResultLogsData, ExecutionsResultLogsError, ExecutionsMetricBundleData, ExecutionsMetricBundleResponse, ExecutionsMetricBundleError, ExecutionsListMetricValuesData, ExecutionsListMetricValuesResponse, ExecutionsListMetricValuesError, ResultsGetResultData, ResultsGetResultError, UtilsHealthCheckData, UtilsHealthCheckResponse } from './types.gen';
import { client as _heyApiClient } from './client.gen';

export type Options<TData extends TDataShape = TDataShape, ThrowOnError extends boolean = boolean> = ClientOptions<TData, ThrowOnError> & {
    /**
     * You can provide a client instance returned by `createClient()` instead of
     * individual options. This might be also useful if you want to implement a
     * custom client.
     */
    client?: Client;
    /**
     * You can pass arbitrary values through the `meta` object. This can be
     * used to access values that aren't defined as part of the SDK function.
     */
    meta?: Record<string, unknown>;
};

/**
 * List Metrics
 * List the currently registered metrics
 */
export const metricsListMetrics = <ThrowOnError extends boolean = false>(options?: Options<MetricsListMetricsData, ThrowOnError>) => {
    return (options?.client ?? _heyApiClient).get<MetricsListMetricsResponse, unknown, ThrowOnError>({
        url: '/api/v1/metrics/',
        ...options
    });
};

/**
 * Get Metric
 * Fetch a result using the slug
 */
export const metricsGetMetric = <ThrowOnError extends boolean = false>(options: Options<MetricsGetMetricData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).get<MetricsGetMetricResponse, MetricsGetMetricError, ThrowOnError>({
        url: '/api/v1/metrics/{provider_slug}/{metric_slug}',
        ...options
    });
};

/**
 * Get Metric Executions
 * Fetch a result using the slug
 */
export const metricsGetMetricExecutions = <ThrowOnError extends boolean = false>(options: Options<MetricsGetMetricExecutionsData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).get<MetricsGetMetricExecutionsResponse, MetricsGetMetricExecutionsError, ThrowOnError>({
        url: '/api/v1/metrics/{provider_slug}/{metric_slug}/executions',
        ...options
    });
};

/**
 * List Metric Values
 * Get all the metric values for a given metric
 */
export const metricsListMetricValues = <ThrowOnError extends boolean = false>(options: Options<MetricsListMetricValuesData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).get<MetricsListMetricValuesResponse, MetricsListMetricValuesError, ThrowOnError>({
        url: '/api/v1/metrics/{provider_slug}/{metric_slug}/values',
        ...options
    });
};

/**
 * List
 * List the most recent executions
 */
export const executionsList = <ThrowOnError extends boolean = false>(options?: Options<ExecutionsListData, ThrowOnError>) => {
    return (options?.client ?? _heyApiClient).get<ExecutionsListResponse, ExecutionsListError, ThrowOnError>({
        url: '/api/v1/executions/',
        ...options
    });
};

/**
 * Get
 * Inspect a specific execution
 */
export const executionsGet = <ThrowOnError extends boolean = false>(options: Options<ExecutionsGetData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).get<ExecutionsGetResponse, ExecutionsGetError, ThrowOnError>({
        url: '/api/v1/executions/{group_id}',
        ...options
    });
};

/**
 * Result
 * Inspect a specific execution result
 *
 * Gets the latest result if no result_id is provided
 */
export const executionsResult = <ThrowOnError extends boolean = false>(options: Options<ExecutionsResultData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).get<ExecutionsResultResponse, ExecutionsResultError, ThrowOnError>({
        url: '/api/v1/executions/{group_id}/result',
        ...options
    });
};

/**
 * Result Datasets
 * Query the datasets that were used for a specific execution
 */
export const executionsResultDatasets = <ThrowOnError extends boolean = false>(options: Options<ExecutionsResultDatasetsData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).get<ExecutionsResultDatasetsResponse, ExecutionsResultDatasetsError, ThrowOnError>({
        url: '/api/v1/executions/{group_id}/datasets',
        ...options
    });
};

/**
 * Result Logs
 * Fetch the logs for an execution result
 */
export const executionsResultLogs = <ThrowOnError extends boolean = false>(options: Options<ExecutionsResultLogsData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).get<unknown, ExecutionsResultLogsError, ThrowOnError>({
        url: '/api/v1/executions/{group_id}/logs',
        ...options
    });
};

/**
 * Metric Bundle
 * Fetch a result using the slug
 */
export const executionsMetricBundle = <ThrowOnError extends boolean = false>(options: Options<ExecutionsMetricBundleData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).get<ExecutionsMetricBundleResponse, ExecutionsMetricBundleError, ThrowOnError>({
        url: '/api/v1/executions/{group_id}/metric_bundle',
        ...options
    });
};

/**
 * List Metric Values
 * Fetch a result using the slug
 */
export const executionsListMetricValues = <ThrowOnError extends boolean = false>(options: Options<ExecutionsListMetricValuesData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).get<ExecutionsListMetricValuesResponse, ExecutionsListMetricValuesError, ThrowOnError>({
        url: '/api/v1/executions/{group_id}/values',
        ...options
    });
};

/**
 * Get Result
 * Fetch a result
 */
export const resultsGetResult = <ThrowOnError extends boolean = false>(options: Options<ResultsGetResultData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).get<unknown, ResultsGetResultError, ThrowOnError>({
        url: '/api/v1/results/{result_id}',
        ...options
    });
};

/**
 * Health Check
 */
export const utilsHealthCheck = <ThrowOnError extends boolean = false>(options?: Options<UtilsHealthCheckData, ThrowOnError>) => {
    return (options?.client ?? _heyApiClient).get<UtilsHealthCheckResponse, unknown, ThrowOnError>({
        url: '/api/v1/utils/health-check/',
        ...options
    });
};