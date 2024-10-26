"""FastAPI-based implementation of each of the components of SGBS training."""


from typing import Annotated

from fastapi import FastAPI, Form, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from markdown import markdown

from sgbs_training.docs import create_exercises
from sgbs_training.email import compose_homework_email, compose_reinvitation_email, compose_homework_reminder_email

app = FastAPI()

app.mount("/static", StaticFiles(directory="apps/static"), name="static")


templates = Jinja2Templates(directory="apps/templates")

stylesheet_urls = {
    "terminal": '<link rel="stylesheet" href="https://unpkg.com/terminal.css@0.7.2/dist/terminal.min.css" />',
    "pure": '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/purecss@3.0.0/build/pure-min.css" integrity="sha384-X38yfunGUhNzHpBaEBsWLO+A0HDYOQi8ufWDkZ0k9e0eXz/tH3II7uKZ9msv++Ls" crossorigin="anonymous">',
    "simple": '<link rel="stylesheet" href="https://cdn.simplecss.org/simple.min.css">',
}


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    body = """# SGBS Training Email Generator

To generate an email, adjust the form parameters below.
"""
    return templates.TemplateResponse(
        "template.html",
        {
            "request": request,
            "body": markdown(body),
            "stylesheet_url": stylesheet_urls["simple"],
        },
        media_type="html",
    )


@app.get("/{scripture}/{num_students}/{num_groups}", response_class=HTMLResponse)
def exercises(request: Request, scripture: str, num_students: int, num_groups: int):
    questions, notes = create_exercises(scripture, num_students, num_groups)
    email_text = compose_homework_email(scripture, questions, notes)
    email_html = markdown(email_text)
    return templates.TemplateResponse(
        "template.html",
        {
            "request": request,
            "body": email_html,
            "stylesheet_url": stylesheet_urls["simple"],
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
    email_text = compose_homework_email(scripture, questions, notes)
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
