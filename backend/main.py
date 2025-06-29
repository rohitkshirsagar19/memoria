import uvicorn
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone, ServerlessSpec
import uuid
import os
from contextlib import asynccontextmanager

# --- Environment Setup ---
# It's best practice to get sensitive keys from environment variables
# We will set these up in Hugging Face Spaces Secrets
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "memoria-index")

# --- Global objects ---
# We load these once at startup to save time and memory
model = None
pc = None
index = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup and shutdown events for the FastAPI app.
    Loads the model and connects to Pinecone on startup.
    """
    global model, pc, index
    print("Application startup...")

    if not PINECONE_API_KEY:
        raise ValueError("PINECONE_API_KEY environment variable not set.")

    # 1. Load the AI Model
    print("Loading lightweight sentence transformer model...")
    model = SentenceTransformer('sentence-transformers/paraphrase-albert-small-v2')
    print("Model loaded.")

    # 2. Connect to Pinecone
    print("Connecting to Pinecone...")
    pc = Pinecone(api_key=PINECONE_API_KEY)

    # 3. Get or create the Pinecone index
    if PINECONE_INDEX_NAME not in pc.list_indexes().names():
        print(f"Creating new Pinecone index: {PINECONE_INDEX_NAME}")
        pc.create_index(
            name=PINECONE_INDEX_NAME,
            dimension=model.get_sentence_embedding_dimension(),
            metric="cosine", # Cosine similarity is great for sentence vectors
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )
    index = pc.Index(PINECONE_INDEX_NAME)
    print("Pinecone setup complete.")
    yield
    # Cleanup logic can go here if needed on shutdown
    print("Application shutdown.")

# --- Pydantic Models ---
class Memory(BaseModel):
    content: str

class SearchQuery(BaseModel):
    query: str

# --- FastAPI App ---
app = FastAPI(
    title="Memoria API",
    description="API for storing and retrieving memories.",
    version="1.0.0",
    lifespan=lifespan # Use the lifespan context manager
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for simplicity
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"status": "ok", "message": "Welcome to the Memoria API!"}

@app.post("/save_memory")
def save_memory(memory: Memory):
    try:
        embedding = model.encode(memory.content).tolist()
        memory_id = str(uuid.uuid4())
        
        # Upsert (update or insert) the vector into Pinecone
        index.upsert(vectors=[{"id": memory_id, "values": embedding, "metadata": {"text": memory.content}}])
        
        print(f"Successfully saved memory with ID: {memory_id}")
        return {"status": "success", "id": memory_id}
    except Exception as e:
        print(f"An error occurred during save: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search_memory")
def search_memory(search: SearchQuery):
    try:
        query_embedding = model.encode(search.query).tolist()
        
        # Query Pinecone for the most similar vectors
        results = index.query(vector=query_embedding, top_k=5, include_metadata=True)
        
        # Extract the original text from the metadata
        retrieved_documents = [match['metadata']['text'] for match in results['matches']]
        
        print(f"Found {len(retrieved_documents)} results for query: '{search.query}'")
        return {"status": "success", "results": retrieved_documents}
    except Exception as e:
        print(f"An error occurred during search: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)



