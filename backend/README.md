# ServeSmart FastAPI backend

The Node/Express backend has been replaced by FastAPI. It keeps the existing API routes and serves the frontend on port 5000.

## Run

1. Start MongoDB locally, or set `MONGODB_URI` and optionally `MONGODB_DATABASE`.
2. From this directory, create and activate a virtual environment:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

3. Start the server:

   ```powershell
   uvicorn main:app --host 0.0.0.0 --port 5000 --reload
   ```

Open `http://localhost:5000`. Interactive API documentation is available at `http://localhost:5000/docs`.
