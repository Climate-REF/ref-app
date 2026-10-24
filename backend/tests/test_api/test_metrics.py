def test_metrics_records_instrumented_requests(client):
    client.get("/api/v1/utils/about")
    response = client.get("/metrics")
    assert response.status_code == 200
    lines = response.text.splitlines()
    assert any(line.startswith("http_requests_total{") and "/api/v1/utils/about" in line for line in lines)
    assert any(line.startswith("http_request_duration_seconds_count{") for line in lines)


def test_metrics_excludes_probes(client):
    assert client.get("/livez").status_code == 200
    assert client.get("/readyz").status_code == 200
    response = client.get("/metrics")
    assert "/livez" not in response.text
    assert "/readyz" not in response.text
    assert 'handler="/metrics"' not in response.text
