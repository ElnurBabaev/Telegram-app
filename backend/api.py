# backend/api.py

import os
import asyncio
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select, Session
from aiogram import Bot, Dispatcher, types
from aiogram.types.web_app_info import WebAppInfo
from aiogram.filters import Command
from dotenv import load_dotenv

# 1. Загрузка переменных окружения
load_dotenv()
BOT_TOKEN  = os.getenv('BOT_TOKEN')
WEBAPP_URL = os.getenv('WEBAPP_URL')
if not BOT_TOKEN or not WEBAPP_URL:
    raise RuntimeError('Переменные BOT_TOKEN и WEBAPP_URL должны быть заданы в .env')

# 2. Инициализация aiogram
bot = Bot(token=BOT_TOKEN)
dp  = Dispatcher()

# 3. Инициализация FastAPI
app = FastAPI(
    title='School Mini App API',
    description='API для Telegram Mini App + встроенный aiogram-бот'
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

# 4. Подключение к базе и моделям
from database import init_db, get_session
from models   import Student, Event, Registration, Reward

# 5. Startup: создаём таблицы и запускаем polling бота
@app.on_event('startup')
async def on_startup():
    init_db()
    loop = asyncio.get_event_loop()
    loop.create_task(dp.start_polling(bot))

# 6. Обработчик команды /start
@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    keyboard = types.InlineKeyboardMarkup().add(
        types.InlineKeyboardButton(
            text='Открыть приложение',
            web_app=WebAppInfo(url=WEBAPP_URL)
        )
    )
    await message.answer(
        '👋 Привет! Нажми кнопку ниже, чтобы открыть мини-приложение.',
        reply_markup=keyboard
    )

# 7. Эндпоинты FastAPI

@app.get('/events', response_model=list[Event])
def read_events(session: Session = Depends(get_session)):
    return session.exec(select(Event)).all()

@app.post('/participate')
def participate(user_id: int, event_id: int, session: Session = Depends(get_session)):
    student = session.get(Student, user_id)
    if not student:
        raise HTTPException(status_code=404, detail='User not found')
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail='Event not found')
    # Проверяем, нет ли уже регистрации
    existing = session.exec(
        select(Registration).where(
            Registration.user_id == user_id,
            Registration.event_id == event_id
        )
    ).first()
    if existing:
        return {'status': 'already_registered'}
    reg = Registration(user_id=user_id, event_id=event_id, attended=False)
    session.add(reg)
    session.commit()
    return {'status': 'registered'}

@app.post('/confirm')
def confirm_attendance(user_id: int, event_id: int, session: Session = Depends(get_session)):
    stmt = select(Registration).where(
        Registration.user_id == user_id,
        Registration.event_id == event_id
    )
    reg = session.exec(stmt).first()
    if not reg:
        raise HTTPException(status_code=404, detail='Registration not found')
    if not reg.attended:
        reg.attended = True
        student = session.get(Student, user_id)
        student.points += session.get(Event, event_id).points
        session.add(student)
        session.commit()
    return {'status': 'confirmed'}

@app.get('/profile/{user_id}', response_model=Student)
def get_profile(user_id: int, session: Session = Depends(get_session)):
    student = session.get(Student, user_id)
    if not student:
        raise HTTPException(status_code=404, detail='User not found')
    return student

@app.get('/rewards', response_model=list[Reward])
def get_rewards(session: Session = Depends(get_session)):
    return session.exec(select(Reward)).all()

@app.post('/redeem')
def redeem(user_id: int, reward_id: int, session: Session = Depends(get_session)):
    student = session.get(Student, user_id)
    reward  = session.get(Reward, reward_id)
    if not student or not reward:
        raise HTTPException(status_code=404, detail='Student or Reward not found')
    if student.points < reward.cost:
        raise HTTPException(status_code=400, detail='Insufficient points')
    student.points -= reward.cost
    student.received_rewards.append(reward_id)
    session.add(student)
    session.commit()
    return {'points': student.points}

@app.get('/class-rating')
def class_rating(session: Session = Depends(get_session)):
    students = session.exec(select(Student)).all()
    groups: dict[str, list[int]] = {}
    for s in students:
        groups.setdefault(s.klass, []).append(s.points)
    result = [
        {'klass': k, 'avg': sum(v)//len(v), 'count': len(v)}
        for k, v in groups.items()
    ]
    result.sort(key=lambda x: x['avg'], reverse=True)
    return result
