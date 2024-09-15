FROM ghcr.io/prefix-dev/pixi:latest

ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID
ARG OPENAI_API_KEY

COPY pixi.lock .
COPY pyproject.toml .

# Copy over custom source code.

COPY sgbs_training sgbs_training
COPY apps apps
RUN pixi install -e api

EXPOSE 8000
ENTRYPOINT ["pixi", "run", "api"]
g
