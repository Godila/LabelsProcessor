import pytest


def pytest_addoption(parser):
    parser.addoption(
        "--run-integration",
        action="store_true",
        default=False,
        help="Run integration tests against real APIs",
    )


@pytest.fixture
def run_integration(request):
    return request.config.getoption("--run-integration")
