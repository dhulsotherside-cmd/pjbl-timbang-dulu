import os
import sys
from pathlib import Path
import uvicorn

# Memastikan direktori root backend terdaftar pada sys.path
# agar modul 'app' selalu dapat diimpor tanpa ModuleNotFoundError
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

if __name__ == "__main__":
    # Menjalankan server ASGI Uvicorn secara terprogram
    # Parameter identik dengan CLI: uvicorn app.main:app --reload --port 8000
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
