"""Automation surrounding Google Docs."""
from dotenv import load_dotenv
from markdown import Markdown
from pydrive2.auth import GoogleAuth
from pydrive2.drive import GoogleDrive

from sgbs_training.authentication import write_creds
from sgbs_training.exercises import study_notes, study_questions
from sgbs_training.scriptures import scripture_mapping

load_dotenv()


def create_exercises(scripture: str, num_students: int, num_groups: int):
    """Create study questions and study notes google docs."""

    with write_creds() as creds_path:
        settings = {
            "client_config_backend": "service",
            "service_config": {
                "client_json_file_path": creds_path.name,
            },
        }
        gauth = GoogleAuth(settings=settings)
        gauth.ServiceAuth()
        drive = GoogleDrive(gauth)

        md = Markdown()

        scripture = scripture_mapping[scripture]

        study_questions_text = study_questions(scripture, num_groups)
        study_questions_file = drive.CreateFile(
            {
                "title": f"{scripture.book()}查經題目",
                "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            }
        )
        study_questions_file.SetContentString(md.convert(study_questions_text))
        study_questions_file.Upload()
        study_questions_file.InsertPermission(
            {"type": "anyone", "role": "writer", "value": "anyone"}
        )

        study_notes_text = study_notes(scripture, num_students)
        study_notes_file = drive.CreateFile(
            {
                "title": f"{scripture.book()}查經筆記",
                "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            }
        )
        study_notes_file.SetContentString(md.convert(study_notes_text))
        study_notes_file.Upload()
        study_notes_file.InsertPermission(
            {"type": "anyone", "role": "writer", "value": "anyone"}
        )

        return study_questions_file, study_notes_file
