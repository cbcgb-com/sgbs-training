FROM condaforge/mambaforge:latest

ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID
ARG OPENAI_API_KEY

COPY environment.yml /tmp/environment.yml

RUN /opt/conda/bin/mamba env update -f /tmp/environment.yml

WORKDIR /root

# Copy over custom source code.
COPY . /root/.
RUN /opt/conda/bin/pip install -e .

ENTRYPOINT ["panel", "serve", "apps/app.py"]
