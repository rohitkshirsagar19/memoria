import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import chromadb
import uuid

print("Starting server setup...")

# --- 1. Initialize Models and Database ---

print("Loading sentence transformer model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("Model loaded.")

print("Initializing ChromaDB...")
db_client = chromadb.PersistentClient(path="./memoria_db")
collection = db_client.get_or_create_collection(name="memories")
print("ChromaDB collection loaded/created.")

# --- 2. Define API Data Models ---

class Memory(BaseModel):
    content: str

# NEW: A Pydantic model for our search queries
class SearchQuery(BaseModel):
    query: str

# --- 3. FastAPI Application and CORS ---

app = FastAPI(
    title="Memoria API",
    description="API for storing and retrieving memories for LLMs.",
    version="0.2.0", # Bump version
)

origins = ["chrome-extension://*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 4. API Endpoints ---

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Welcome to the Memoria API!"}

@app.post("/save_memory")
def save_memory(memory: Memory):
    try:
        embedding = model.encode(memory.content).tolist()
        memory_id = str(uuid.uuid4())
        collection.add(
            embeddings=[embedding],
            documents=[memory.content],
            ids=[memory_id]
        )
        print(f"Successfully saved memory with ID: {memory_id}")
        return {"status": "success", "id": memory_id}
    except Exception as e:
        print(f"An error occurred during save: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- NEW: The Search Endpoint ---
@app.post("/search_memory")
def search_memory(search: SearchQuery):
    """
    Receives a search query, generates an embedding, and queries the database
    for the most similar memories.
    """
    try:
        print(f"Received query: '{search.query}'")

        # 1. Create an embedding for the search query.
        query_embedding = model.encode(search.query).tolist()

        # 2. Query the collection to find the most similar results.
        #    `n_results` specifies how many memories to return.
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=5  # Let's get the top 5 most relevant memories
        )
        
        # The 'documents' key contains the original text of the memories.
        retrieved_documents = results.get('documents', [])
        print(f"Found {len(retrieved_documents[0])} results.")
        
        return {"status": "success", "results": retrieved_documents[0]}

    except Exception as e:
        print(f"An error occurred during search: {e}")
        raise HTTPException(status_code=500, detail=str(e))


print("Server setup complete. Starting Uvicorn.")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)