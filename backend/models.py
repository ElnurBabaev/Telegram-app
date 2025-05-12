# backend/models.py
# Здесь мы описываем все сущности базы данных с помощью SQLModel

from sqlmodel import SQLModel, Field
from typing import List, Optional
from sqlalchemy import Column, JSON

class Student(SQLModel, table=True):
    """
    Модель ученика (студента).
    - user_id: Telegram ID пользователя.
    - full_name: ФИО.
    - klass: Класс (например, "10А").
    - points: Текущее количество баллов.
    - received_rewards: Список ID наград, которые ученик уже получил.
    """
    user_id: int = Field(primary_key=True, index=True)
    full_name: str
    klass: str
    points: int = Field(default=0)
    received_rewards: List[int] = Field(
        default_factory=list,
        sa_column=Column(JSON)
    )

class Event(SQLModel, table=True):
    """
    Модель мероприятия.
    - id: уникальный идентификатор.
    - title: название мероприятия.
    - description: краткое описание.
    - date: дата в формате YYYY-MM-DD.
    - points: баллы за участие.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    date: str
    points: int

class Registration(SQLModel, table=True):
    """
    Связующая модель: кто записан на какое мероприятие.
    - id: уникальный идентификатор записи.
    - user_id: Telegram ID ученика.
    - event_id: ID мероприятия.
    - attended: флаг подтверждения участия админом.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    event_id: int
    attended: bool = Field(default=False)

class Reward(SQLModel, table=True):
    """
    Модель вознаграждения.
    - id: уникальный идентификатор награды.
    - title: название (например, "Блокнот").
    - cost: стоимость в баллах.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    cost: int
