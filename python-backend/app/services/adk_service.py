# python-backend/app/services/adk_service.py
import json
from typing import Optional, Dict, Any
from uuid import UUID
from supabase import Client
from config.database import get_supabase

class SessionService:
    """
    Service for managing ADK agent sessions in the Supabase database.
    """

    def __init__(self, supabase_client: Client):
        self.db = supabase_client

    def get_session(self, *, session_id: UUID, user_id: UUID) -> Optional[Dict[str, Any]]:
        """
        Retrieves a session for a given user.

        Args:
            session_id: The ID of the session to retrieve.
            user_id: The ID of the user owning the session.

        Returns:
            The session data as a dictionary, or None if not found.
        """
        try:
            result = self.db.table("adk_sessions").select("session_data").eq("id", str(session_id)).eq("user_id", str(user_id)).single().execute()
            if result.data:
                return result.data.get("session_data")
            return None
        except Exception as e:
            print(f"Error getting session: {e}")
            return None

    def create_session(self, *, user_id: UUID, session_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Creates a new session for a user.

        Args:
            user_id: The ID of the user creating the session.
            session_data: The initial session data to store.

        Returns:
            The newly created session record, or None on failure.
        """
        try:
            result = self.db.table("adk_sessions").insert({
                "user_id": str(user_id),
                "session_data": json.dumps(session_data)
            }).execute()
            if result.data:
                return result.data[0]
            return None
        except Exception as e:
            print(f"Error creating session: {e}")
            return None

    def update_session(self, *, session_id: UUID, session_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Updates an existing session.

        Args:
            session_id: The ID of the session to update.
            session_data: The new session data to store.

        Returns:
            The updated session record, or None on failure.
        """
        try:
            result = self.db.table("adk_sessions").update({
                "session_data": json.dumps(session_data)
            }).eq("id", str(session_id)).execute()
            if result.data:
                return result.data[0]
            return None
        except Exception as e:
            print(f"Error updating session: {e}")
            return None

def get_session_service() -> "SessionService":
    """
    Dependency injection provider for the SessionService.
    """
    supabase_client = get_supabase()
    return SessionService(supabase_client)
