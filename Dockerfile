FROM condaforge/mambaforge:latest

ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID
ARG OPENAI_API_KEY

COPY requirements-app.txt /tmp/requirements-app.txt

RUN /opt/conda/bin/pip install -r /tmp/requirements-app.txt

WORKDIR /root

# Copy over custom source code.
COPY . /root/.
RUN /opt/conda/bin/pip install -e .

EXPOSE 8000
ENTRYPOINT ["uvicorn", "apps.api:app", "--host", "0.0.0.0", "--port", "5006"]
