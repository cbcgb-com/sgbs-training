"""Panel app to generate email and Google docs."""

import panel as pn
from sgbs_training.email import compose_homework_email
from sgbs_training.docs import create_exercises
from markdown import markdown

from sgbs_training.scriptures import Luke, John, Ephesians, James
from sgbs_training.authentication import write_creds

from dotenv import load_dotenv
from pyprojroot import here

load_dotenv()

write_creds()

# def user_is_authorized(user_info: dict):
#     """Check if the user is authorized to access the app.

#     Args:

#         user_info (dict): The user information.

#     Returns:

#         bool: True if the user is authorized, False otherwise.
#     """
#     with open(here() / 'apps/users.txt') as f:
#         valid_users = [line.strip("\n") for line in f.readlines()]

#     print(user_info['login'] in valid_users)
#     return user_info['login'] in valid_users


# pn.config.authorize_callback = user_is_authorized

scripture_choices = [Luke, John, Ephesians, James]

scripture = pn.widgets.Select(
    name="Scripture",
    options={s.__name__: s for s in scripture_choices},
)

num_students = pn.widgets.IntSlider(name="Number of Students", start=1, end=30)
num_groups = pn.widgets.IntSlider(name="Number of Groups", start=1, end=10)

email_html = pn.pane.HTML()


def write_email(event):
    questions, notes = create_exercises(
        scripture.value, num_students=num_students.value, num_groups=num_groups.value
    )
    text = compose_homework_email(scripture.value, questions, notes)
    email_html.object = markdown(text)


compose_button = pn.widgets.Button(name="Compose", button_type="success")
compose_button.on_click(write_email)

pn.Column(scripture, num_groups, num_students, compose_button, email_html).servable()
