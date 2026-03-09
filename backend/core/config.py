import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_BASE_URL = "https://dqcqexieqlfqylqwogsj.supabase.co"
SUPABASE_ENDPOINT = "/rest/v1/inbound_leads"
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
PAGE_SIZE = 250
