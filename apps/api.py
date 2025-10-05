"""FastAPI-based implementation of each of the components of SGBS training."""

from typing import Annotated

from fastapi import FastAPI, Form, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from markdown import markdown

from sgbs_training.docs import create_exercises
from sgbs_training.email import (
    compose_homework_email_legacy,
    compose_reinvitation_email,
    compose_homework_reminder_email,
)

app = FastAPI()

app.mount("/static", StaticFiles(directory="apps/static"), name="static")


templates = Jinja2Templates(directory="apps/templates")

# Stylesheet URLs removed - now using Tailwind CSS directly in template


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse(
        "template.html",
        {
            "request": request,
        },
        media_type="html",
    )


@app.get("/{scripture}/{num_students}/{num_groups}", response_class=HTMLResponse)
def exercises(request: Request, scripture: str, num_students: int, num_groups: int):
    questions, notes = create_exercises(scripture, num_students, num_groups)
    email_text = compose_homework_email_legacy(scripture, questions, notes)
    email_html = markdown(email_text)
    return templates.TemplateResponse(
        "template.html",
        {
            "request": request,
            "body": email_html,
        },
        media_type="html",
    )


@app.post("/form/scripture", response_class=HTMLResponse)
def form_scripture(
    scripture: Annotated[str, Form()],
    num_students: Annotated[int, Form()],
    num_groups: Annotated[int, Form()],
):
    questions, notes = create_exercises(scripture, num_students, num_groups)
    email_text = compose_homework_email_legacy(scripture, questions, notes)
    email_html = markdown(email_text)
    return email_html


@app.post("/validate/num_students", response_class=HTMLResponse)
def validate_num_students(num_students: Annotated[int, Form()]):
    output = ""
    if num_students < 1:
        output += "<small>Number of students must be at least 1.</small>"
        return output
    return output


@app.post("/validate/num_groups", response_class=HTMLResponse)
def validate_num_groups(num_groups: Annotated[int, Form()]):
    output = ""
    if num_groups < 1:
        output += "<small>Number of groups must be at least 1.</small>"
        return output
    return output


@app.get("/reinvitation-email", response_class=HTMLResponse)
def get_reinvitation_email():
    email_text = compose_reinvitation_email()
    email_html = markdown(email_text)
    return email_html


@app.get("/homework-reminder-email", response_class=HTMLResponse)
def get_homework_reminder_email():
    email_text = compose_homework_reminder_email()
    email_html = markdown(email_text)
    return email_html
