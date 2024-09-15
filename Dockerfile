FROM ghcr.io/prefix-dev/pixi:latest

ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID
ARG OPENAI_API_KEY

COPY pyproject.toml pixi.toml /root/

WORKDIR /root

# Copy over custom source code.
COPY . /root/

RUN pixi install -e api

EXPOSE 8000
ENTRYPOINT ["pixi", "run", "-e", "api", "uvicorn", "apps.api:app", "--host", "0.0.0.0", "--port", "5006"]
