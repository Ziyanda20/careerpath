from fastapi import APIRouter, Depends
from database import chat_col
from models.schemas import ChatMessage
from services.chatbot_service import chat
from routers.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/chat", tags=["Chatbot"])


@router.post("/message")
def send_message(body: ChatMessage, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])

    # Load last 10 messages for this user
    history_docs = list(chat_col.find(
        {"user_id": user_id},
        {"role": 1, "content": 1, "_id": 0}
    ).sort("timestamp", -1).limit(10))
    history = list(reversed(history_docs))

    # Get AI response
    reply = chat(body.message, history, body.aps_score)

    # Save user message + AI reply
    now = datetime.utcnow()
    chat_col.insert_many([
        {"user_id": user_id, "role": "user",      "content": body.message, "timestamp": now},
        {"user_id": user_id, "role": "assistant",  "content": reply,        "timestamp": now},
    ])

    return {"reply": reply}


@router.get("/history")
def get_history(current_user=Depends(get_current_user)):
    docs = list(chat_col.find(
        {"user_id": str(current_user["_id"])},
        {"role": 1, "content": 1, "timestamp": 1, "_id": 0}
    ).sort("timestamp", 1).limit(50))
    for d in docs:
        d["timestamp"] = d["timestamp"].isoformat()
    return {"history": docs}


@router.delete("/history")
def clear_history(current_user=Depends(get_current_user)):
    chat_col.delete_many({"user_id": str(current_user["_id"])})
    return {"message": "Chat history cleared"}
