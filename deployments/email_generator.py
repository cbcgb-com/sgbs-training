"""
This file is used to deploy the email generator app to Modal.

It is deployed on CI/CD to ericmjl's test environment on PR branches
and to the main environment on pushes to main.
"""

import modal


image = (
    modal.Image.debian_slim()
    .run_commands("apt-get update && apt-get install curl -y")
    .run_commands("curl -fsSL https://pixi.sh/install.sh | sh")
    .add_local_dir("./apps", "/usr/local/src/apps", copy=True)
    .add_local_dir("./sgbs_training", "/usr/local/src/sgbs_training", copy=True)
    .add_local_file("./pyproject.toml", "/usr/local/src/pyproject.toml", copy=True)
    .add_local_file("./pixi.lock", "/usr/local/src/pixi.lock", copy=True)
    .workdir("/usr/local/src")
    .run_commands("/root/.pixi/bin/pixi install")
)

app = modal.App(name="sgbs-training-emails-generator")


@app.function(image=image, secrets=[modal.Secret.from_name("sgbs-training-secrets")])
@modal.web_server(5006, startup_timeout=120)
def run_app():
    import subprocess

    subprocess.Popen("/root/.pixi/bin/pixi run app", shell=True)
