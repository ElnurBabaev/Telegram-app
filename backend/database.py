# backend/database.py
# Настройка подключения к базе данных SQLite с помощью SQLModel

from sqlmodel import SQLModel, create_engine, Session
import os

# Пусть файл базы хранится рядом с backend
DB_FILE = os.path.join(os.path.dirname(__file__), "school.db")
DB_URL = f"sqlite:///{DB_FILE}"

# Создаём движок SQLAlchemy/SQLModel
engine = create_engine(
    DB_URL,
    echo=True,             # выводит в консоль SQL-запросы для отладки
    connect_args={"check_same_thread": False}  # нужно для SQLite в многопоточном контексте
)


def init_db():
    """
    Создаёт все таблицы, описанные в моделях (SQLModel.metadata).
    Вызывать при старте приложения.
    """
    SQLModel.metadata.create_all(engine)


def get_session():
    """
    Функция-зависимость для FastAPI. При каждом запросе открывает сессию,
    а после обработки — закрывает.
    Использование:
        @app.get("/...")
        def read(..., session: Session = Depends(get_session)):
            ...
    """
    with Session(engine) as session:
        yield session
